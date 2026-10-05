import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../../src/api/mock/api'
import { defaultOffers } from '../../src/api/mock/commerce'
import { accessStatus, period, validateSelection } from '../../src/api/commerce-rules'
import type { ClubApi } from '../../src/api/types'
import type { Selection } from '../../src/api/commerce-types'
import { demoAccounts, demoPassword } from '../../src/api/mock/demo'
import { commerceCopy } from '../../src/features/commerce/copy'
import { accountDestination } from '../../src/features/auth/redirect'

const now = Date.parse('2026-10-03T12:00:00Z')
const gym: Selection = { format: 'membership', months: 1, zones: 'gym', date: '2026-10-03' }
const pass: Selection = { format: 'single_visit', months: null, zones: 'both', date: '2026-10-03' }
let serial = 0
async function client(api: ClubApi) {
  await api.register({ first_name: 'Test', last_name: 'Client', email: 'test@example.test', password: 'Password123!', locale: 'en' })
  await api.verifyDemoEmail()
}
async function add(api: ClubApi, selection: Selection = gym) {
  const offer = (await api.offers()).find(o => o.format === selection.format && o.months === selection.months && o.zones === selection.zones)!
  return api.putCartItem({ selection, expected_price_byn: offer.price_byn, expected_revision: offer.revision, idempotency_key: 'add-' + ++serial })
}
async function checkout(api: ClubApi, currency: 'BYN' | 'USD' | 'EUR' = 'BYN', promo_code = '') {
  const cart = await api.cart()
  const quote = await api.quote({ cart_version: cart.version, currency, promo_code })
  const input = { cart_version: cart.version, currency, promo_code, expected_total_byn: quote.total_byn, expected_total_currency: quote.total_currency, expected_rate: quote.byn_per_unit, idempotency_key: 'checkout-' + ++serial }
  return { order: await api.checkout(input), input }
}
const pay = (api: ClubApi, id: string, successful = true) => api.pay(id, { successful, idempotency_key: 'pay-' + ++serial })

describe('configured commerce', () => {
  it('preserves guest choices on registration, requires verification, isolates owners and roles', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    const guest = await add(api, pass)
    await expect(checkout(api)).rejects.toMatchObject({ code: 'unauthorized' })
    await api.register({ first_name: 'Test', last_name: 'Client', email: 'test@example.test', password: 'Password123!', locale: 'en' })
    expect((await api.cart()).items).toEqual(guest.items)
    await expect(checkout(api)).rejects.toMatchObject({ code: 'verify_email' })
    await api.verifyDemoEmail()
    const { order } = await checkout(api)
    await api.logout()
    expect((await api.cart()).items).toEqual([])
    await api.login({ email: demoAccounts.CLIENT, password: demoPassword })
    await expect(api.order(order.id)).rejects.toMatchObject({ code: 'not_found' })
    await expect(pay(api, order.id)).rejects.toMatchObject({ code: 'not_found' })
    expect((await api.orders()).some(o => o.id === order.id)).toBe(false)
    await api.login({ email: demoAccounts.TRAINER, password: demoPassword })
    await expect(api.cart()).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.accesses()).rejects.toMatchObject({ code: 'forbidden' })
  })
  it('issues no access until success; records failure, retry and idempotent checkout/payment', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    await client(api); await add(api, pass)
    const { order, input } = await checkout(api)
    expect(await api.accesses()).toEqual([])
    expect((await api.checkout(input)).id).toBe(order.id)
    await expect(api.checkout({ ...input, currency: 'EUR' })).rejects.toMatchObject({ code: 'idempotency_conflict' })
    const failure = { successful: false, idempotency_key: 'decline' }
    await api.pay(order.id, failure); await api.pay(order.id, failure)
    expect((await api.order(order.id)).attempts).toHaveLength(1)
    expect(await api.accesses()).toEqual([])
    const paid = await Promise.all([api.pay(order.id, { successful: true, idempotency_key: 'success' }), api.pay(order.id, { successful: true, idempotency_key: 'success' })])
    expect(paid[0].status).toBe('paid')
    expect(paid[0].attempts.map(a => a.status)).toEqual(['failed', 'succeeded'])
    await pay(api, order.id)
    expect(await api.accesses()).toHaveLength(1)
    expect((await api.accesses())[0]).toMatchObject({ redeemed_at: null, zones: 'both', format: 'single_visit' })
    expect(await api.memberships()).toEqual([])
  })
  it('allows overlapping disjoint zones and adjacent periods; rejects shared zones in cart and existing access', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    await client(api); await add(api); await add(api, { ...gym, zones: 'pool' })
    const { order } = await checkout(api); expect((await pay(api, order.id)).status).toBe('paid')
    expect((await api.memberships()).map(m => m.zones)).toEqual(['gym', 'pool'])
    const cart = await add(api, { ...gym, zones: 'both' })
    await expect(api.quote({ cart_version: cart.version, currency: 'BYN' })).rejects.toMatchObject({ code: 'membership_overlap' })
    await api.removeCartItem(cart.items[0].id, cart.version)
    await add(api, { ...gym, date: '2026-11-03' }); await checkout(api)
    await add(api); await add(api)
    await expect(checkout(api)).rejects.toMatchObject({ code: 'membership_overlap' })
  })
  it('rechecks at payment so two pending orders cannot issue overlapping memberships', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    await client(api); await add(api); const a = await checkout(api)
    await add(api); const b = await checkout(api)
    const outcomes = await Promise.all([pay(api, a.order.id), pay(api, b.order.id)])
    expect(outcomes.map(o => o.status)).toEqual(['paid', 'pending'])
    expect(outcomes[1].attempts[0].reason).toBe('membership_overlap')
    expect(await api.memberships()).toHaveLength(1)
  })
  it('requires explicit repricing; saves immutable catalogue and currency snapshots', async () => {
    const catalogue = defaultOffers()
    const api = createMockApi({ now: () => now, latency: 0, catalogue })
    await client(api); const cart = await add(api)
    const offer = catalogue.find(o => o.id === cart.items[0].product.offer_id)!
    offer.price_byn = '100.00'; offer.revision++
    await expect(checkout(api)).rejects.toMatchObject({ code: 'price_changed' })
    expect((await api.cart()).items[0].product.price_byn).toBe('80.00')
    await api.refreshCart(cart.version)
    const { order } = await checkout(api, 'USD', 'northside10')
    expect(order).toMatchObject({ subtotal_byn: '100.00', discount_byn: '10.00', total_byn: '90.00', total_currency: '27.69', currency: 'USD' })
    offer.price_byn = '999.00'; offer.is_active = false; offer.allows_group = false
    const result = await pay(api, order.id)
    expect(result.items).toEqual(order.items)
    expect(result.total_currency).toBe('27.69')
    expect((await api.accesses())[0].allows_group).toBe(true)
    expect((await api.accesses())[0].product?.price_byn).toBe('100.00')
  })
  it('rejects unavailable offers, old cart versions, invalid promotions and cancelled payment', async () => {
    const catalogue = defaultOffers()
    const api = createMockApi({ now: () => now, latency: 0, catalogue })
    await client(api); const cart = await add(api, pass)
    await expect(api.removeCartItem(cart.items[0].id, 0)).rejects.toMatchObject({ code: 'cart_changed' })
    await expect(checkout(api, 'BYN', 'INVALID')).rejects.toMatchObject({ code: 'invalid_promo' })
    const offer = catalogue.find(o => o.id === cart.items[0].product.offer_id)!
    offer.is_active = false
    await expect(checkout(api)).rejects.toMatchObject({ code: 'offer_unavailable' })
    offer.is_active = true
    const { order } = await checkout(api)
    await api.cancelOrder(order.id)
    await expect(pay(api, order.id)).rejects.toMatchObject({ code: 'order_changed' })
    expect(await api.accesses()).toEqual([])
  })
  it('edits configured items, removes to empty, rejects altered add price and deduplicates adds', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    const offer = (await api.offers()).find(o => o.format === 'single_visit' && o.zones === 'both')!
    const input = { selection: pass, expected_price_byn: offer.price_byn, expected_revision: offer.revision, idempotency_key: 'same-add' }
    await expect(api.putCartItem({ ...input, expected_price_byn: '0.01' })).rejects.toMatchObject({ code: 'price_changed' })
    const first = await api.putCartItem(input)
    await api.putCartItem(input)
    expect((await api.cart()).items).toHaveLength(1)
    const edited = await api.putCartItem({ ...input, selection: { ...pass, date: '2026-10-10' }, item_id: first.items[0].id, cart_version: first.version, idempotency_key: 'edit' })
    expect(edited.items[0].product.date).toBe('2026-10-10')
    await api.removeCartItem(edited.items[0].id, edited.version)
    await expect(checkout(api)).rejects.toMatchObject({ code: 'cart_empty' })
  })
  it('checks overlaps within the guest cart and rejects empty zones at the API boundary', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    const first = await add(api)
    await add(api)
    await expect(api.quote({ cart_version: (await api.cart()).version, currency: 'BYN' })).rejects.toMatchObject({ code: 'membership_overlap' })
    const cart = await api.cart()
    await api.removeCartItem(cart.items[1].id, cart.version)
    await add(api, { ...gym, zones: 'pool' })
    expect((await api.quote({ cart_version: (await api.cart()).version, currency: 'EUR' })).total_currency).toBe('47.22')
    const product = first.items[0].product
    await expect(api.putCartItem({ selection: { ...gym, zones: '' } as unknown as Selection, expected_price_byn: product.price_byn, expected_revision: product.offer_revision, idempotency_key: 'empty-zones' })).rejects.toMatchObject({ code: 'zones_required' })
  })
  it('rejects stale dates at checkout and payment', async () => {
    let clock = now
    const api = createMockApi({ now: () => clock, latency: 0 })
    await client(api); await add(api, pass)
    const { order } = await checkout(api)
    await add(api, pass); clock += 86_400_000
    await expect(checkout(api)).rejects.toMatchObject({ code: 'invalid_date' })
    expect((await pay(api, order.id)).attempts[0].reason).toBe('invalid_date')
    expect(await api.accesses()).toEqual([])
  })
  it('rejects a delayed guest write after the session changes', async () => {
    vi.useFakeTimers()
    try {
      const options = { latency: 0, now: () => now }
      const api = createMockApi(options)
      const offer = (await api.offers())[0]
      options.latency = 100
      const pending = api.putCartItem({ selection: gym, expected_price_byn: offer.price_byn, expected_revision: offer.revision, idempotency_key: 'late' }).catch(error => error)
      options.latency = 0; await client(api)
      await vi.advanceTimersByTimeAsync(100)
      expect(await pending).toMatchObject({ code: 'unauthorized' })
      expect((await api.cart()).items).toEqual([])
    } finally { vi.useRealTimers() }
  })
  it('exposes all four single-visit states without claiming purchase is admission', async () => {
    const api = createMockApi({ now: () => now, latency: 0 })
    await api.login({ email: demoAccounts.CLIENT, password: demoPassword })
    const passes = (await api.accesses()).filter(a => a.format === 'single_visit')
    expect(passes.map(a => accessStatus(a, now))).toEqual(['unused', 'used', 'expired', 'cancelled'])
    expect(accessStatus(passes[0], Date.parse(passes[0].ends_at))).toBe('expired')
  })
})

describe('purchase dates and translations', () => {
  it.each(['2026-02-30', '2026-10-02', '', 'not-a-date', '9999-12-31'])('rejects invalid date %s', date => {
    expect(() => validateSelection({ ...gym, date }, now)).toThrow()
  })
  it('uses Minsk midnight and clamps calendar-month ends', () => {
    expect(period({ ...gym, date: '2028-01-31' })).toEqual({ starts_at: '2028-01-30T21:00:00.000Z', ends_at: '2028-02-28T21:00:00.000Z' })
    expect(period({ ...pass, date: '2026-12-31' }).ends_at).toBe('2026-12-31T21:00:00.000Z')
  })
  it('has matching RU/EN text keys and safe purchase redirects', () => {
    expect(Object.keys(commerceCopy.ru)).toEqual(Object.keys(commerceCopy.en))
    expect(Object.keys(commerceCopy.ru.errors)).toEqual(Object.keys(commerceCopy.en.errors))
    for (const path of ['/cart', '/account/orders/123', '/account/access/visit-123']) expect(accountDestination(path)).toBe(path)
    for (const path of ['//evil.test', '/cart?next=https://evil.test', '/account/orders/../profile']) expect(accountDestination(path)).toBe('/account')
  })
})
