import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../../src/api/mock/api'
import { createFixtures } from '../../src/api/mock/fixtures'
import { bookingEligibility, canCancel } from '../../src/api/booking-rules'
import { demoAccounts, demoPassword } from '../../src/api/mock/demo'
import type { ClubApi } from '../../src/api/types'
import { trainingCopy } from '../../src/features/training/copy'
import { accountDestination } from '../../src/features/auth/redirect'
import { purchaseLink, selectionFromParams } from '../../src/features/memberships/purchase-link'
const now = Date.parse('2026-10-03T12:00:00Z')
const login = (api: ClubApi, email: string = demoAccounts.CLIENT) => api.login({ email, password: demoPassword })

async function buy(api: ClubApi, zones: 'gym' | 'pool', months: 1 | 3 = 1, format: 'membership' | 'single_visit' = 'membership') {
  const selection = format === 'membership' ? { format, zones, months, date: '2026-10-03' } as const : { format, zones, months: null, date: '2026-10-03' } as const
  const offer = (await api.offers()).find(o => o.format === selection.format && o.months === selection.months && o.zones === zones)!
  const cart = await api.putCartItem({ selection, expected_price_byn: offer.price_byn, expected_revision: offer.revision, idempotency_key: 'add-' + zones + format })
  const quote = await api.quote({ cart_version: cart.version, currency: 'BYN' })
  const order = await api.checkout({ cart_version: cart.version, currency: 'BYN', expected_total_byn: quote.total_byn, expected_total_currency: quote.total_currency, expected_rate: quote.byn_per_unit, idempotency_key: 'order-' + zones + format })
  await api.pay(order.id, { successful: true, idempotency_key: 'pay-' + order.id })
}
async function fresh(api: ClubApi) { await api.register({ first_name: 'New', last_name: 'Client', email: 'new@example.test', password: 'Password123!', locale: 'en' }); await api.verifyDemoEmail() }

describe('training API', () => {
  it('supports request, approval, linked notifications, read state and cancellation releasing a place', async () => {
    const api = createMockApi({ now: () => now, latency: 0 }); await login(api)
    const before = (await api.slots()).find(s => s.id === '12')!
    const b = await api.book({ training_slot_id: '12' })
    expect(b.status).toBe('pending')
    expect((await api.slots()).find(s => s.id === '12')!.reserved_count).toBe(before.reserved_count + 1)
    await api.demoDecision(b.id, { status: 'approved' })
    expect((await api.slots()).find(s => s.id === '12')!.reserved_count).toBe(before.reserved_count + 1)
    const notification = (await api.notifications())[0]
    expect(notification.target).toEqual({ kind: 'booking', id: b.id })
    await api.readNotification(notification.id); await api.readNotification(notification.id)
    expect((await api.notifications()).find(n => n.id === notification.id)!.read_at).not.toBeNull()
    await expect(api.decide(b.id, { status: 'cancelled', reason: '  ' })).rejects.toMatchObject({ code: 'reason_required' })
    await api.decide(b.id, { status: 'cancelled', reason: 'Changed plans' })
    expect((await api.slots()).find(s => s.id === '12')!.reserved_count).toBe(before.reserved_count)
    await expect(api.demoDecision(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'booking_changed' })
  })
  it('gates email, zone and training format, and excludes single visits', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    await api.register({ first_name: 'New', last_name: 'Client', email: 'new@example.test', password: 'Password123!', locale: 'en' })
    expect((await api.eligibility('12')).code).toBe('verify_email')
    await api.verifyDemoEmail()
    await buy(api, 'pool', 1, 'single_visit')
    expect((await api.eligibility('12')).code).toBe('membership_required')
    await buy(api, 'gym')
    expect((await api.eligibility('12')).code).toBe('zone_required')
    await buy(api, 'pool')
    expect((await api.eligibility('13')).code).toBe('training_permission')
    expect((await api.eligibility('12')).eligible).toBe(true)
    await api.book({ training_slot_id: '12' })
    // Different memberships/zones still cannot create simultaneous training bookings.
    await expect(api.book({ training_slot_id: '1' })).rejects.toMatchObject({ code: 'booking_overlap' })
  })
  it('serializes last-place requests and duplicate submissions', async () => {
    const api = createMockApi({ now: () => now, latency: 0 }); await login(api)
    const results = await Promise.allSettled([api.book({ training_slot_id: '13' }), api.book({ training_slot_id: '13' })])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect((await api.slots()).find(s => s.id === '13')!.reserved_count).toBe(1)
    await login(api, 'max@northside.demo')
    await expect(api.book({ training_slot_id: '13' })).rejects.toMatchObject({ code: 'slot_full' })
  })
  it('enforces ownership, role checks, and terminal states', async () => {
    const api = createMockApi({ now: () => now, latency: 0 }); await login(api)
    const b = await api.book({ training_slot_id: '12' })
    await expect(api.decide(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'forbidden' })
    await login(api, 'max@northside.demo')
    await expect(api.booking(b.id)).rejects.toMatchObject({ code: 'not_found' })
    await expect(api.demoDecision(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'not_found' })
    await expect(api.readNotification('1')).rejects.toMatchObject({ code: 'not_found' })
    await login(api, demoAccounts.TRAINER)
    await expect(api.demoDecision(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.decide(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'not_found' })
    await login(api)
    await api.demoDecision(b.id, { status: 'rejected' })
    expect((await api.booking(b.id)).reason).toBe('demo_rejected')
    expect((await api.eligibility('12')).eligible).toBe(true)
    await expect(api.decide(b.id, { status: 'cancelled', reason: 'test' })).rejects.toMatchObject({ code: 'booking_changed' })
  })
  it('allows cancellation exactly 12h before and rejects it a millisecond later', async () => {
    let clock = now
    const api = createMockApi({ now: () => clock, latency: 0 }); await login(api)
    const a = await api.book({ training_slot_id: '12' })
    clock = Date.parse(a.slot.starts_at) - 43_200_000
    expect(canCancel(a, clock)).toBe(true)
    await api.decide(a.id, { status: 'cancelled', reason: 'Boundary' })
    const b = await api.book({ training_slot_id: '12' }); clock++
    await expect(api.decide(b.id, { status: 'cancelled', reason: 'Late' })).rejects.toMatchObject({ code: 'cancellation_deadline' })
  })
  it('rechecks trainer/client activity and time on approval', async () => {
    let clock = now
    const api = createMockApi({ now: () => clock, latency: 0 }); await login(api)
    const b = await api.book({ training_slot_id: '12' })
    await login(api, demoAccounts.ADMIN); await api.setUserActive('7', false); await login(api)
    await expect(api.demoDecision(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'slot_unavailable' })
    await login(api, demoAccounts.ADMIN); await api.setUserActive('7', true); await login(api)
    clock = Date.parse(b.slot.starts_at)
    await expect(api.demoDecision(b.id, { status: 'approved' })).rejects.toMatchObject({ code: 'slot_unavailable' })
    expect((await api.booking(b.id)).requires_attention).toBe(true)
  })
  it('expires a session and keeps recovery demonstrational without changing credentials', async () => {
    const api = createMockApi({ now: () => now, latency: 0 }); await login(api)
    await api.expireDemoSession()
    expect(await api.session()).toBeNull()
    await expect(api.bookings()).rejects.toMatchObject({ code: 'unauthorized' })
    await expect(api.recoverDemoPassword('bad')).rejects.toMatchObject({ code: 'invalid_email' })
    await api.recoverDemoPassword(demoAccounts.CLIENT); await api.recoverDemoPassword('unknown@example.test')
    expect((await login(api)).id).toBe('1')
  })
  it('rejects delayed private responses after changing clients', async () => {
    vi.useFakeTimers()
    try {
      const options = { latency: 0, now: () => now }; const api = createMockApi(options); await login(api)
      options.latency = 100
      const delayed = api.book({ training_slot_id: '12' }).catch(e => e)
      options.latency = 0; await login(api, 'max@northside.demo'); await vi.advanceTimersByTimeAsync(100)
      expect(await delayed).toMatchObject({ code: 'unauthorized' })
      expect((await api.slots()).find(s => s.id === '12')!.reserved_count).toBe(0)
    } finally { vi.useRealTimers() }
  })
  it('keeps trainer slots from overlapping', async () => {
    const api = createMockApi({ now: () => now, latency: 0 }); await login(api, demoAccounts.TRAINER)
    const slot = (await api.slots()).find(s => s.id === '1')!
    await expect(api.createSlot({ ...slot })).rejects.toMatchObject({ code: 'trainer_overlap' })
  })
  it('new customers complete a paid pool membership to approved coached booking', async () => {
    const api = createMockApi({ now: () => now, latency: 0 }); await fresh(api); await buy(api, 'pool')
    const b = await api.book({ training_slot_id: '12' })
    expect((await api.demoDecision(b.id, { status: 'approved' })).status).toBe('approved')
    expect((await api.notifications()).some(n => n.target?.kind === 'order')).toBe(true)
  })
})

describe('membership time boundaries and repeat purchases', () => {
  it('accepts exact coverage and adjacent bookings but rejects expired/cancelled/short access', () => {
    const f = createFixtures(now), slot = f.slots[11]
    const m = { ...f.memberships[0], starts_at: slot.starts_at, ends_at: slot.ends_at }
    expect(bookingEligibility(slot, [m], [], now).eligible).toBe(true)
    for (const bad of [{ ...m, cancelled_at: m.starts_at }, { ...m, ends_at: new Date(Date.parse(slot.ends_at) - 1).toISOString() }, { ...m, starts_at: new Date(Date.parse(slot.starts_at) + 1).toISOString() }]) expect(bookingEligibility(slot, [bad], [], now).code).toBe('membership_required')
    const adjacent = { ...f.bookings[0], slot: { ...slot, starts_at: new Date(Date.parse(slot.starts_at) - 3600_000).toISOString(), ends_at: slot.starts_at } }
    expect(bookingEligibility(slot, [m], [adjacent], now).eligible).toBe(true)
  })
  it('renewal rounds legacy end times up to the next Minsk day and keeps product choices', () => {
    const product = createFixtures(now).orders[0].items[0].product
    const link = purchaseLink(product, true, now)
    const selection = selectionFromParams(new URLSearchParams(link.split('?')[1]))!
    expect(selection).toMatchObject({ zones: 'both', months: 3, format: 'membership' })
    expect(Date.parse(selection.date + 'T00:00:00+03:00')).toBeGreaterThanOrEqual(Date.parse(product.ends_at))
    expect(selectionFromParams(new URLSearchParams('format=bad&zones=admin&date=bad'))).toBeUndefined()
  })
  it('keeps dictionaries aligned and schedule redirects safe', () => {
    expect(Object.keys(trainingCopy.ru)).toEqual(Object.keys(trainingCopy.en))
    expect(Object.keys(trainingCopy.ru.errors)).toEqual(Object.keys(trainingCopy.en.errors))
    expect(accountDestination('/schedule/12')).toBe('/schedule/12')
    expect(accountDestination('/schedule/12?redirect=https://evil.test')).toBe('/account')
  })
})

