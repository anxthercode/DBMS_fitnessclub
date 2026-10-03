import { ApiError, type ClubApi, type Role, type User, type Notification } from '../types'
import { createFixtures, demoPassword } from './fixtures'
import { clubContent } from './club'
import { accessOfferPreviews } from './access-offers'
import { createTraining } from './training'
import { createCommerce } from './commerce'
import type { Offer } from '../commerce-types'
import { profileSchema } from '../profile-schema'
const cents = (s: string) => Math.round(Number(s) * 100)
const amount = (n: number) => (n / 100).toFixed(2)
export function createMockApi(options: { now?: () => number; latency?: number; storage?: Storage; catalogue?: Offer[] } = {}): ClubApi {
  const now = options.now || Date.now
  const data = createFixtures(now())
  // Demo passwords exist only in memory; no passwords/tokens are stored in browser storage.
  const credentials = new Map(data.users.map(u => [u.email, demoPassword]))
  let currentId: string | null = null; let sequence = 2000
  const nextId = () => String(++sequence)
  const stamp = () => new Date(now()).toISOString()
  const fail = (code: string, status = 400): never => { throw new ApiError(code, status) }
  const user = (roles?: Role[]): User => { const u = data.users.find(u => u.id === currentId); if (!u || !u.is_active) return fail('unauthorized', 401); if (roles && !roles.includes(u.role)) return fail('forbidden', 403); return u }
  const notify = (recipient: string, title_ru: string, title_en: string, body_ru: string, body_en: string, target?: Notification['target']) => data.notifications.unshift({ id: nextId(), recipient_user_id: recipient, title_ru, title_en, body_ru, body_en, created_at: stamp(), read_at: null, target })
  // Each mutation runs synchronously after the artificial delay, so mock changes are atomic in one tab.
  const run = async <T>(fn: () => T): Promise<T> => { if (options.latency !== 0) await new Promise(r => setTimeout(r, options.latency ?? 180)); return structuredClone(fn()) }
  const asUser = <T>(roles: Role[] | undefined, fn: (u: User) => T): Promise<T> => {
    const requestUserId = currentId
    return run(() => {
      const u = user(roles)
      if (u.id !== requestUserId) return fail('unauthorized', 401)
      return fn(u)
    })
  }
  const commerce = createCommerce(data, { now, nextId, currentId: () => currentId, client: () => user(['CLIENT']), run, notify }, options.catalogue)
  const api: ClubApi = {
    ...commerce.api,
    ...createTraining(data, { now, nextId, run, asUser, notify }),
    accessOfferPreviews: () => run(() => accessOfferPreviews),
    session: () => run(() => data.users.find(u => u.id === currentId && u.is_active) || null),
    login: input => run(() => { const u = data.users.find(u => u.email === input.email.trim().toLowerCase() && u.is_active); if (!u || credentials.get(u.email) !== input.password) return fail('invalid_credentials', 401); currentId = u.id; if (u.role === 'CLIENT') commerce.claimGuestCart(u.id); return u }),
    register: input => run(() => { const email = input.email.trim().toLowerCase(); if (data.users.some(u => u.email === email)) fail('email_exists', 409); const u: User = { id: nextId(), email, first_name: input.first_name.trim(), last_name: input.last_name.trim(), role: 'CLIENT', locale: input.locale, phone: null, is_active: true, email_verified_at: null }; data.users.push(u); credentials.set(email, input.password); currentId = u.id; commerce.claimGuestCart(u.id); return u }),
    logout: () => run(() => { currentId = null; commerce.resetGuest() }),
    expireDemoSession: () => asUser(undefined, () => { currentId = null; commerce.resetGuest() }),
    recoverDemoPassword: email => run(() => { if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('invalid_email') }),
    verifyDemoEmail: () => asUser(['CLIENT'], u => { u.email_verified_at = stamp(); return u }),
    profile: input => asUser(undefined, u => {
      const parsed = profileSchema.safeParse({ ...input, phone: input.phone ?? '' })
      if (!parsed.success) return fail('invalid_profile')
      const { first_name, last_name, phone, locale } = parsed.data
      Object.assign(u, { first_name, last_name, phone: phone || null, locale })
      return u
    }),
    club: () => run(() => clubContent),
    plans: () => run(() => data.plans), trainers: () => run(() => data.trainers.filter(t => data.users.find(u => u.id === t.user_id)?.is_active)),
    memberships: () => asUser(['CLIENT', 'ADMIN'], u => data.memberships.filter(m => u.role === 'ADMIN' || m.client_id === u.id)),
    users: () => run(() => {user(['ADMIN']);return data.users}),
    setUserActive: (key,is_active) => run(() => {const u=user(['ADMIN']);if(key===u.id) fail('self_deactivation');const target=data.users.find(u=>u.id===key);if(!target)return fail('not_found',404);target.is_active=is_active;return target}),
    setPlanActive: (key,is_active) => run(() => {user(['ADMIN']);const p=data.plans.find(p=>p.id===key);if(!p)return fail('not_found',404);p.is_active=is_active;return p}),
    discounts: () => run(() => {user(['ADMIN']);return data.discounts}), setDiscountActive: (key,is_active) => run(() => {user(['ADMIN']);const d=data.discounts.find(d=>d.id===key);if(!d)return fail('not_found',404);d.is_active=is_active;return d}),
    rates: () => run(() => data.rates),
    analytics: () => run(() => { user(['ADMIN']);return { revenue_byn:amount(data.orders.filter(o=>o.status==='paid').reduce((s,o)=>s+cents(o.total_byn),0)),clients:data.users.filter(u=>u.role==='CLIENT'&&u.is_active).length,active_memberships:data.memberships.filter(m=>!m.cancelled_at&&Date.parse(m.starts_at)<=now()&&Date.parse(m.ends_at)>now()).length,attendance:data.bookings.filter(b=>b.status==='attended').length,weeks:Array.from({length:4},(_,i)=>({label:String(i+1),revenue_byn:amount(data.orders.filter(o=>o.status==='paid'&&now()-Date.parse(o.created_at)>=(3-i)*7*86400000&&now()-Date.parse(o.created_at)<(4-i)*7*86400000).reduce((s,o)=>s+cents(o.total_byn),0))}))} }),
  }
  return api
}
