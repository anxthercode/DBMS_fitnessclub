import type { ClubApi } from './types'
export const isMock = import.meta.env.VITE_API_MODE !== 'http'

let implementation: Promise<ClubApi> | undefined

// Load on the first request, not during module evaluation. Top-level await here
// can deadlock production chunks that import shared API types from the entry chunk.
function method<K extends keyof ClubApi>(key: K): ClubApi[K] {
  return ((...args: Parameters<ClubApi[K]>) => {
    implementation ??= isMock
      ? import('./mock/api').then(module => module.createMockApi())
      : import('./http').then(module => module.httpApi)
    return implementation.then(api => Reflect.apply(api[key], api, args))
  }) as ClubApi[K]
}

export const api: ClubApi = {
  accessOfferPreviews: method('accessOfferPreviews'),
  session: method('session'), login: method('login'), register: method('register'), logout: method('logout'),
  verifyDemoEmail: method('verifyDemoEmail'), profile: method('profile'),
  club: method('club'), plans: method('plans'), trainers: method('trainers'), slots: method('slots'),
  memberships: method('memberships'), bookings: method('bookings'), book: method('book'), decide: method('decide'),
  booking: method('booking'), eligibility: method('eligibility'), demoDecision: method('demoDecision'), expireDemoSession: method('expireDemoSession'), recoverDemoPassword: method('recoverDemoPassword'),
  createSlot: method('createSlot'), cancelSlot: method('cancelSlot'),
  offers: method('offers'), cart: method('cart'), putCartItem: method('putCartItem'), removeCartItem: method('removeCartItem'), refreshCart: method('refreshCart'), quote: method('quote'), checkout: method('checkout'),
  order: method('order'), cancelOrder: method('cancelOrder'), accesses: method('accesses'),
  orders: method('orders'), pay: method('pay'), notifications: method('notifications'), readNotification: method('readNotification'),
  users: method('users'), setUserActive: method('setUserActive'), setPlanActive: method('setPlanActive'),
  discounts: method('discounts'), setDiscountActive: method('setDiscountActive'), rates: method('rates'), analytics: method('analytics'),
}
