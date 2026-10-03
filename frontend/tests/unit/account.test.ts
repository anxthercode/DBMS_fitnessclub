import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../../src/api/mock/api'
import { createFixtures } from '../../src/api/mock/fixtures'
import { demoAccounts, demoPassword } from '../../src/api/mock/demo'
import { profileSchema } from '../../src/api/profile-schema'
import { membershipStatus, sortMemberships } from '../../src/features/account/membership-status'
import { accountDestination } from '../../src/features/auth/redirect'

const profile = { first_name: 'Тест', last_name: 'Клиент', phone: '+375 (29) 123-45-67', locale: 'ru' as const }
const now = Date.parse('2026-09-30T12:00:00Z')

describe('profile validation and ownership', () => {
  it.each(['', '+375 (29) 123-45-67', '1234567'])('accepts an optional phone or a valid formatted phone: %s', phone => {
    expect(profileSchema.safeParse({ ...profile, phone }).success).toBe(true)
  })

  it.each(['abc1234567', '123', '1'.repeat(16), '++375291234567'])('rejects invalid phone: %s', phone => {
    expect(profileSchema.safeParse({ ...profile, phone }).success).toBe(false)
  })

  it('rejects profile access without authentication', async () => {
    const api = createMockApi({ latency: 0 })
    await expect(api.profile(profile)).rejects.toMatchObject({ code: 'unauthorized' })
    await expect(api.memberships()).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('updates only the current user and ignores protected fields', async () => {
    const api = createMockApi({ latency: 0 })
    await api.login({ email: demoAccounts.CLIENT, password: demoPassword })
    const injected = { ...profile, first_name: '  Тест  ', phone: '  ', id: '5', role: 'ADMIN', email: 'changed@forma.demo', is_active: false }
    const result = await api.profile(injected)
    expect(result).toMatchObject({ id: '1', role: 'CLIENT', email: demoAccounts.CLIENT, first_name: 'Тест', phone: null, is_active: true })
    await api.logout()
    await api.login({ email: 'max@forma.demo', password: demoPassword })
    expect(await api.session()).toMatchObject({ id: '5', first_name: 'Максим' })
  })

  it('validates at the mock boundary and leaves the profile unchanged after failure', async () => {
    const api = createMockApi({ latency: 0 })
    const before = await api.login({ email: demoAccounts.CLIENT, password: demoPassword })
    await expect(api.profile({ ...profile, first_name: '   ' })).rejects.toMatchObject({ code: 'invalid_profile' })
    await expect(api.profile({ ...profile, phone: 'invalid' })).rejects.toMatchObject({ code: 'invalid_profile' })
    expect(await api.session()).toEqual(before)
  })

  it('isolates client memberships and rejects the trainer role', async () => {
    const api = createMockApi({ latency: 0, now: () => now })
    await api.login({ email: demoAccounts.CLIENT, password: demoPassword })
    const memberships = await api.memberships()
    expect(memberships).toHaveLength(4)
    expect(memberships.every(item => item.client_id === '1')).toBe(true)
    await api.logout()
    await api.login({ email: 'max@forma.demo', password: demoPassword })
    expect((await api.memberships()).map(item => item.client_id)).toEqual(['5'])
    await api.logout()
    await api.login({ email: demoAccounts.TRAINER, password: demoPassword })
    await expect(api.memberships()).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('gives new clients an empty membership list', async () => {
    const api = createMockApi({ latency: 0 })
    await api.register({ first_name: 'Новый', last_name: 'Клиент', email: 'new@forma.demo', password: 'TestPass123!', locale: 'ru' })
    expect(await api.memberships()).toEqual([])
  })

  it('rejects delayed requests if the user changes before they execute', async () => {
    vi.useFakeTimers()
    try {
      const options = { latency: 0 }
      const api = createMockApi(options)
      await api.login({ email: demoAccounts.CLIENT, password: demoPassword })
      options.latency = 50
      const pendingProfile = api.profile(profile)
      const pendingMemberships = api.memberships()
      const assertions = Promise.all([
        expect(pendingProfile).rejects.toMatchObject({ code: 'unauthorized' }),
        expect(pendingMemberships).rejects.toMatchObject({ code: 'unauthorized' }),
      ])
      options.latency = 0
      await api.logout()
      await api.login({ email: 'max@forma.demo', password: demoPassword })
      await vi.advanceTimersByTimeAsync(50)
      await assertions
      expect(await api.session()).toMatchObject({ id: '5', first_name: 'Максим' })
    } finally { vi.useRealTimers() }
  })
})

describe('membership periods', () => {
  const memberships = createFixtures(now).memberships.filter(item => item.client_id === '1')
  const active = memberships[0]

  it('handles exact start/end instants and cancellation precedence', () => {
    expect(membershipStatus(active, Date.parse(active.starts_at) - 1)).toBe('pending')
    expect(membershipStatus(active, Date.parse(active.starts_at))).toBe('active')
    expect(membershipStatus(active, Date.parse(active.ends_at) - 1)).toBe('active')
    expect(membershipStatus(active, Date.parse(active.ends_at))).toBe('expired')
    expect(membershipStatus({ ...active, cancelled_at: active.starts_at }, now)).toBe('cancelled')
  })

  it('orders current memberships before history without mutating API results', () => {
    const originalIds = memberships.map(item => item.id)
    expect(sortMemberships(memberships, now).map(item => membershipStatus(item, now))).toEqual(['active', 'pending', 'expired', 'cancelled'])
    expect(memberships.map(item => item.id)).toEqual(originalIds)
  })
})

describe('safe post-login navigation', () => {
  it.each([null, 'https://example.com', '//example.com', '/admin', '/account/../admin', '/account?redirect=https://example.com'])('rejects an unsupported redirect: %s', value => {
    expect(accountDestination(value)).toBe('/account')
  })
  it('preserves the requested profile page', () => {
    expect(accountDestination('/account/profile')).toBe('/account/profile')
  })
})
