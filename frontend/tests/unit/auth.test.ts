import { describe, expect, it } from 'vitest'
import { createMockApi } from '../../src/api/mock/api'
import { demoAccounts, demoPassword } from '../../src/api/mock/fixtures'
import { loginSchema, registerSchema } from '../../src/features/auth/schemas'

const registration = {
  first_name: '  Тест  ', last_name: 'Клиент', email: 'new@northside.demo',
  password: 'TestPass123!', confirm_password: 'TestPass123!',
}

describe('public form validation', () => {
  it('trims names and email but preserves the exact password', () => {
    const result = registerSchema.parse({ ...registration, email: ' new@northside.demo ' })
    expect(result.first_name).toBe('Тест')
    expect(result.email).toBe('new@northside.demo')
    expect(result.password).toBe(registration.password)
  })

  it.each([
    { first_name: '   ' }, { last_name: '' }, { email: 'not-an-email' },
    { password: 'short', confirm_password: 'short' },
    { password: '        ', confirm_password: '        ' },
    { password: 'a'.repeat(129), confirm_password: 'a'.repeat(129) },
    { confirm_password: 'different-password' },
  ])('rejects invalid registration values: %j', invalid => {
    expect(registerSchema.safeParse({ ...registration, ...invalid }).success).toBe(false)
  })

  it('rejects missing credentials', () => {
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false)
  })
})

describe('mock authentication boundary', () => {
  it('rejects incorrect credentials without creating a session', async () => {
    const api = createMockApi({ latency: 0 })
    await expect(api.login({ email: demoAccounts.CLIENT, password: 'wrong' })).rejects.toMatchObject({ code: 'invalid_credentials' })
    expect(await api.session()).toBeNull()
  })

  it('registers a client, signs out, and accepts normalized email on sign-in', async () => {
    const api = createMockApi({ latency: 0 })
    const user = await api.register({ ...registration, locale: 'en' })
    expect(user).toMatchObject({ role: 'CLIENT', locale: 'en', email_verified_at: null })
    expect(user).not.toHaveProperty('password')
    await api.logout()
    expect(await api.session()).toBeNull()
    expect((await api.login({ email: ' NEW@NORTHSIDE.DEMO ', password: registration.password })).id).toBe(user.id)
  })

  it('rejects a duplicate email regardless of case', async () => {
    const api = createMockApi({ latency: 0 })
    await expect(api.register({ ...registration, email: ' CLIENT@NORTHSIDE.DEMO ', locale: 'ru' })).rejects.toMatchObject({ code: 'email_exists' })
    expect(await api.session()).toBeNull()
  })

  it('does not retain accounts or sessions in a new mock instance', async () => {
    const api = createMockApi({ latency: 0 })
    await api.register({ ...registration, locale: 'ru' })
    const refreshed = createMockApi({ latency: 0 })
    expect(await refreshed.session()).toBeNull()
    await expect(refreshed.login({ email: registration.email, password: registration.password })).rejects.toMatchObject({ code: 'invalid_credentials' })
  })

  it('accepts the displayed demo account', async () => {
    const api = createMockApi({ latency: 0 })
    expect((await api.login({ email: demoAccounts.CLIENT, password: demoPassword })).role).toBe('CLIENT')
  })
})
