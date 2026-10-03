import { ApiError, type ClubApi } from './types'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try { response = await fetch(`${baseUrl}${path}`, { method, credentials: 'include', headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000) }) }
  catch { throw new ApiError('network', 0) }
  if (!response.ok) { const error = await response.json().catch(() => ({})) as { code?: string }; throw new ApiError(error.code || 'unknown', response.status) }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
const id = encodeURIComponent
export const httpApi: ClubApi = {
  accessOfferPreviews: () => Promise.reject(new ApiError('demo_only')),
  session: async () => { try { return await request('/auth/session') } catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e } },
  login: body => request('/auth/login', 'POST', body), register: body => request('/auth/register', 'POST', body), logout: () => request('/auth/logout', 'POST'),
  verifyDemoEmail: () => Promise.reject(new ApiError('demo_only')),
  profile: body => request('/users/me', 'PATCH', body),
  club: () => request('/club'), plans: () => request('/membership-plans'), trainers: () => request('/trainers'), slots: () => request('/training-slots'),
  memberships: () => request('/memberships'), bookings: () => request('/bookings'), book: body => request('/bookings', 'POST', body), decide: (key, body) => request(`/bookings/${id(key)}/decision`, 'POST', body),
  booking: key => request(`/bookings/${id(key)}`), eligibility: key => request(`/training-slots/${id(key)}/eligibility`),
  demoDecision: () => Promise.reject(new ApiError('demo_only')), expireDemoSession: () => Promise.reject(new ApiError('demo_only')), recoverDemoPassword: () => Promise.reject(new ApiError('demo_only')),
  createSlot: body => request('/training-slots', 'POST', body), cancelSlot: key => request(`/training-slots/${id(key)}/cancel`, 'POST'),
  offers: () => request('/access-offers'),
  cart: () => request('/cart'), putCartItem: body => request('/cart/items', 'PUT', body),
  removeCartItem: (key, version) => request(`/cart/items/${id(key)}`, 'DELETE', { version }),
  refreshCart: version => request('/cart/refresh', 'POST', { version }),
  quote: body => request('/cart/quote', 'POST', body),
  order: key => request(`/orders/${id(key)}`), cancelOrder: key => request(`/orders/${id(key)}/cancel`, 'POST'),
  accesses: () => request('/access'),
  checkout: body => request('/orders', 'POST', body), orders: () => request('/orders'), pay: (key, body) => request(`/orders/${id(key)}/payments`, 'POST', body),
  notifications: () => request('/notifications'), readNotification: key => request(`/notifications/${id(key)}/read`, 'POST'),
  users: () => request('/users'), setUserActive: (key, is_active) => request(`/users/${id(key)}`, 'PATCH', { is_active }),
  setPlanActive: (key, is_active) => request(`/membership-plans/${id(key)}`, 'PATCH', { is_active }), discounts: () => request('/discounts'), setDiscountActive: (key, is_active) => request(`/discounts/${id(key)}`, 'PATCH', { is_active }),
  rates: () => request('/exchange-rates'), analytics: () => request('/reports/overview'),
}
