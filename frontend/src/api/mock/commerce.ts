import { ApiError, type User, type Membership, type Discount, type ExchangeRate, type Notification } from '../types'
import type { AccessGrant, Cart, CommerceApi, Offer, Order, Product, Quote, QuoteInput, Selection } from '../commerce-types'
import { amount, assertNoMembershipOverlap, cents, minskDay, period, validateSelection } from '../commerce-rules'
import { accessOfferPreviews } from './access-offers'

export const defaultOffers = (): Offer[] => accessOfferPreviews.map((o, index) => ({ ...o, id: String(index + 1), revision: 1, is_active: true,
  allows_group: o.format === 'membership', allows_individual: o.format === 'membership' && o.months !== 1 }))

interface Context {
  now(): number; nextId(): string; currentId(): string | null; client(): User
  run<T>(fn: () => T): Promise<T>
  notify(id: string, ru: string, en: string, bodyRu: string, bodyEn: string, target?: Notification['target']): unknown
}
interface State { memberships: Membership[]; orders: Order[]; discounts: Discount[]; rates: ExchangeRate[] }

export function createCommerce(state: State, ctx: Context, catalogue = defaultOffers()) {
  const carts = new Map<string, Cart>()
  const added = new Map<string, string>()
  const checkedOut = new Map<string, { fingerprint: string; orderId: string }>()
  const paid = new Map<string, { successful: boolean; orderId: string }>()
  const grants: AccessGrant[] = []
  const stamp = () => new Date(ctx.now()).toISOString()
  const fail = (code: string, status = 400): never => { throw new ApiError(code, status) }
  const cartFor = (owner: string) => {
    let cart = carts.get(owner)
    if (!cart) { cart = { id: owner, version: 0, items: [] }; carts.set(owner, cart) }
    return cart
  }
  const invoke = <T>(fn: (owner: string) => T, guest = false) => {
    const caller = ctx.currentId()
    return ctx.run(() => {
      if (caller !== ctx.currentId()) return fail('unauthorized', 401)
      const owner = caller ? ctx.client().id : guest ? 'guest' : fail('unauthorized', 401)
      return fn(owner)
    })
  }
  const requestKey = (key: string) => { if (typeof key !== 'string' || key.length < 1 || key.length > 160) fail('invalid_request'); return key }
  const offerFor = (selection: Selection) => {
    validateSelection(selection, ctx.now())
    const offer = catalogue.find(o => o.format === selection.format && o.zones === selection.zones && o.months === selection.months && o.is_active)
    if (!offer) return fail('offer_unavailable')
    if (!/^\d+\.\d{2}$/.test(offer.price_byn) || cents(offer.price_byn) <= 0) return fail('offer_unavailable')
    return offer
  }
  const productFor = (selection: Selection, offer: Offer): Product => ({
    format: selection.format, months: selection.months, zones: selection.zones, date: selection.date,
    offer_id: offer.id, offer_revision: offer.revision, price_byn: offer.price_byn,
    ...period(selection), allows_group: offer.allows_group, allows_individual: offer.allows_individual,
    amenities_included: true, single_entry: selection.format === 'single_visit',
  } as Product)
  const ownOrder = (owner: string, id: string) => state.orders.find(o => o.id === id && o.client_id === owner) || fail('not_found', 404)
  const accessFor = (owner: string): AccessGrant[] => [
    ...state.memberships.filter(m => m.client_id === owner).map(m => ({
      id: 'membership-' + m.id, client_id: owner, format: 'membership' as const, zones: m.zones || 'both' as const,
      starts_at: m.starts_at, ends_at: m.ends_at, cancelled_at: m.cancelled_at, redeemed_at: null,
      allows_group: m.allows_group, allows_individual: m.allows_individual, order_id: m.order_id || null,
      product: m.order_id ? grants.find(a => a.id === 'membership-' + m.id)?.product || state.orders.find(o => o.id === m.order_id)?.items[0]?.product || null : null,
    })),
    ...grants.filter(a => a.client_id === owner && a.format === 'single_visit'),
  ]
  const quoteFor = (owner: string, input: QuoteInput): Quote => {
    const cart = cartFor(owner)
    if (cart.version !== input.cart_version) fail('cart_changed', 409)
    if (!cart.items.length) fail('cart_empty')
    if (cart.items.length > 12) fail('cart_limit')
    for (const { product } of cart.items) {
      const offer = offerFor(product)
      if (offer.id !== product.offer_id || offer.revision !== product.offer_revision || offer.price_byn !== product.price_byn) fail('price_changed', 409)
    }
    assertNoMembershipOverlap(cart.items.map(i => i.product), owner === 'guest' ? [] : accessFor(owner))
    const subtotal = cart.items.reduce((sum, i) => sum + cents(i.product.price_byn), 0)
    const code = input.promo_code?.trim().toUpperCase() || null
    const discount = code ? state.discounts.find(d => d.code === code && d.is_active) : null
    if (code && !discount) fail('invalid_promo')
    const discountValue = discount ? Math.min(subtotal, discount.kind === 'percent' ? Math.round(subtotal * Number(discount.value) / 100) : cents(discount.value)) : 0
    const total = subtotal - discountValue
    if (!['BYN', 'USD', 'EUR'].includes(input.currency)) fail('invalid_currency')
    const rate = input.currency === 'BYN' ? null : state.rates.find(r => r.currency === input.currency)
    if (input.currency !== 'BYN' && (!rate || Number(rate.byn_per_unit) <= 0)) fail('rate_unavailable')
    const rateUnits = rate ? BigInt(Math.round(Number(rate.byn_per_unit) * 100_000_000)) : 100_000_000n
    const converted = Number((BigInt(total) * 100_000_000n + rateUnits / 2n) / rateUnits)
    return { cart_version: cart.version, subtotal_byn: amount(subtotal), discount_byn: amount(discountValue), total_byn: amount(total),
      promo_code: code, currency: input.currency, total_currency: amount(converted), byn_per_unit: rate?.byn_per_unit || '1.00000000', rate_date: rate?.effective_at || null }
  }

  // Read-only reception examples, never a client check-in operation.
  for (const [index, status] of ['unused', 'used', 'expired', 'cancelled'].entries()) {
    const date = minskDay(ctx.now() + (status === 'expired' ? -86_400_000 : 0))
    const selection: Selection = { format: 'single_visit', months: null, zones: index % 2 ? 'pool' : 'both', date }
    const offer = defaultOffers().find(o => o.format === 'single_visit' && o.zones === selection.zones)!
    grants.push({ id: 'visit-demo-' + index, client_id: '1', format: 'single_visit', zones: selection.zones, ...period(selection),
      cancelled_at: status === 'cancelled' ? stamp() : null, redeemed_at: status === 'used' ? stamp() : null,
      allows_group: false, allows_individual: false, order_id: null, product: productFor(selection, offer) })
  }

  const api: CommerceApi = {
    offers: () => ctx.run(() => catalogue.filter(o => o.is_active)),
    cart: () => invoke(cartFor, true),
    putCartItem: input => invoke(owner => {
      const cart = cartFor(owner)
      const key = owner + ':' + requestKey(input.idempotency_key)
      const fingerprint = JSON.stringify(input)
      if (added.has(key)) { if (added.get(key) !== fingerprint) fail('idempotency_conflict', 409); return cart }
      if (input.cart_version !== undefined && cart.version !== input.cart_version) fail('cart_changed', 409)
      const offer = offerFor(input.selection)
      if (offer.price_byn !== input.expected_price_byn || offer.revision !== input.expected_revision) fail('price_changed', 409)
      const index = input.item_id ? cart.items.findIndex(i => i.id === input.item_id) : -1
      if (input.item_id && index === -1) fail('not_found', 404)
      if (!input.item_id && cart.items.length >= 12) fail('cart_limit')
      const item = { id: input.item_id || ctx.nextId(), product: productFor(input.selection, offer) }
      if (index === -1) cart.items.push(item); else cart.items[index] = item
      cart.version++; added.set(key, fingerprint)
      return cart
    }, true),
    removeCartItem: (id, version) => invoke(owner => {
      const cart = cartFor(owner)
      if (cart.version !== version) fail('cart_changed', 409)
      if (!cart.items.some(i => i.id === id)) fail('not_found', 404)
      cart.items = cart.items.filter(i => i.id !== id); cart.version++
      return cart
    }, true),
    refreshCart: version => invoke(owner => {
      const cart = cartFor(owner)
      if (cart.version !== version) fail('cart_changed', 409)
      const items = cart.items.map(i => ({ id: i.id, product: productFor(i.product, offerFor(i.product)) }))
      cart.items = items; cart.version++
      return cart
    }, true),
    quote: input => invoke(owner => quoteFor(owner, input), true),
    checkout: input => invoke(owner => {
      const key = owner + ':' + requestKey(input.idempotency_key)
      const fingerprint = JSON.stringify(input)
      const previous = checkedOut.get(key)
      if (previous) { if (previous.fingerprint !== fingerprint) fail('idempotency_conflict', 409); return ownOrder(owner, previous.orderId) }
      if (!ctx.client().email_verified_at) fail('verify_email')
      const quote = quoteFor(owner, input)
      if (quote.total_byn !== input.expected_total_byn || quote.total_currency !== input.expected_total_currency || quote.byn_per_unit !== input.expected_rate) fail('price_changed', 409)
      const cart = cartFor(owner)
      const order: Order = { ...quote, id: ctx.nextId(), client_id: owner, status: 'pending', created_at: stamp(), items: structuredClone(cart.items), attempts: [], access_ids: [] }
      state.orders.unshift(order); checkedOut.set(key, { fingerprint, orderId: order.id })
      cart.items = []; cart.version++
      return order
    }),
    orders: () => invoke(owner => state.orders.filter(o => o.client_id === owner)),
    order: id => invoke(owner => ownOrder(owner, id)),
    cancelOrder: id => invoke(owner => {
      const order = ownOrder(owner, id)
      if (order.status !== 'pending') fail('order_changed', 409)
      order.status = 'cancelled'; return order
    }),
    pay: (id, input) => invoke(owner => {
      if (typeof input.successful !== 'boolean') fail('invalid_request')
      const order = ownOrder(owner, id)
      const key = owner + ':' + id + ':' + requestKey(input.idempotency_key)
      const previous = paid.get(key)
      if (previous) { if (previous.successful !== input.successful) fail('idempotency_conflict', 409); return order }
      if (order.status === 'paid') return order
      if (order.status !== 'pending') fail('order_changed', 409)
      let reason: string | null = input.successful ? null : 'payment_declined'
      if (!reason) try {
        for (const item of order.items) validateSelection(item.product, ctx.now())
        assertNoMembershipOverlap(order.items.map(i => i.product), accessFor(owner))
      } catch (error) { if (!(error instanceof ApiError)) throw error; reason = error.code }
      order.attempts.push({ id: ctx.nextId(), created_at: stamp(), status: reason ? 'failed' : 'succeeded', reason })
      paid.set(key, { orderId: id, successful: input.successful })
      if (reason) return order
      for (const { product } of order.items) {
        const id = ctx.nextId()
        const grant: AccessGrant = { id: (product.format === 'membership' ? 'membership-' : 'visit-') + id, client_id: owner,
          format: product.format, zones: product.zones, starts_at: product.starts_at, ends_at: product.ends_at,
          cancelled_at: null, redeemed_at: null, allows_group: product.allows_group, allows_individual: product.allows_individual,
          order_id: order.id, product: structuredClone(product) }
        grants.push(grant); order.access_ids.push(grant.id)
        if (product.format === 'membership') state.memberships.push({ id, client_id: owner, starts_at: product.starts_at, ends_at: product.ends_at,
          cancelled_at: null, plan_name_ru: 'Абонемент · ' + product.months + ' мес.', plan_name_en: 'Membership · ' + product.months + ' mo.',
          zones: product.zones, order_id: order.id, allows_group: product.allows_group, allows_individual: product.allows_individual })
      }
      order.status = 'paid'
      ctx.notify(owner, 'Доступ оформлен', 'Access issued', 'Оплата подтверждена. Доступ появился в кабинете.', 'Payment confirmed. Your access is in your account.', { kind: 'order', id: order.id })
      return order
    }),
    accesses: () => invoke(accessFor),
  }
  return { api, claimGuestCart(owner: string) {
    const guest = cartFor('guest'); const target = cartFor(owner)
    if (guest.items.length) { target.items.push(...guest.items); target.version++; guest.items = []; guest.version++ }
  }, resetGuest() { carts.delete('guest') } }
}
