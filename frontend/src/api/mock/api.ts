import { ApiError, type ClubApi, type Role, type User, type Slot, type Booking, type Cart, type Order } from '../types'
import { createFixtures, demoPassword } from './fixtures'
import { clubContent } from './club'
import { profileSchema } from '../profile-schema'
const active = (b: Booking) => b.status === 'pending' || b.status === 'approved'
const overlaps = (a: Slot, b: Slot) => a.starts_at < b.ends_at && b.starts_at < a.ends_at
const cents = (s: string) => Math.round(Number(s) * 100)
const amount = (n: number) => (n / 100).toFixed(2)
export function createMockApi(options: { now?: () => number; latency?: number; storage?: Storage } = {}): ClubApi {
  const now = options.now || Date.now
  const data = createFixtures(now())
  const carts: Record<string, Cart> = {}
  const checkouts = new Map<string, Order>(); const payments = new Map<string, Order>()
  // Demo passwords exist only in memory; no passwords/tokens are stored in browser storage.
  const credentials = new Map(data.users.map(u => [u.email, demoPassword]))
  let currentId: string | null = null; let sequence = 2000
  const nextId = () => String(++sequence)
  const stamp = () => new Date(now()).toISOString()
  const fail = (code: string, status = 400): never => { throw new ApiError(code, status) }
  const user = (roles?: Role[]): User => { const u = data.users.find(u => u.id === currentId); if (!u || !u.is_active) return fail('unauthorized', 401); if (roles && !roles.includes(u.role)) return fail('forbidden', 403); return u }
  const owner = (b: Booking) => data.memberships.find(m => m.id === b.membership_id)!.client_id
  const slotView = (s: Slot): Slot => ({ ...s, reserved_count: data.bookings.filter(b => b.training_slot_id === s.id && active(b)).length })
  const bookingView = (b: Booking): Booking => ({ ...b, slot: slotView(data.slots.find(s => s.id === b.training_slot_id)!), requires_attention: b.status === 'pending' && (now() - Date.parse(b.created_at) >= 43_200_000 || Date.parse(b.slot.starts_at) <= now()) })
  const cart = () => { const u = user(['CLIENT']); return carts[u.id] ||= { id: u.id, version: 0, items: [] } }
  const notify = (recipient: string, title_ru: string, title_en: string, body_ru: string, body_en: string) => data.notifications.unshift({ id: nextId(), recipient_user_id: recipient, title_ru, title_en, body_ru, body_en, created_at: stamp(), read_at: null })
  const eligible = (s: Slot, clientId: string, excludedId?: string) => {
    if (s.status !== 'scheduled' || Date.parse(s.starts_at) <= now() || !data.users.find(u => u.id === s.trainer_id)?.is_active) fail('slot_unavailable')
    const m = data.memberships.find(m => m.client_id === clientId && !m.cancelled_at && m.starts_at <= s.starts_at && m.ends_at >= s.ends_at && (s.training_type === 'group' ? m.allows_group : m.allows_individual))
    if (!m) return fail('membership_required')
    if (data.bookings.some(b => owner(b) === clientId && b.id !== excludedId && active(b) && overlaps(b.slot, s))) fail('booking_overlap', 409)
    return m
  }
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
  const api: ClubApi = {
    session: () => run(() => data.users.find(u => u.id === currentId && u.is_active) || null),
    login: input => run(() => { const u = data.users.find(u => u.email === input.email.trim().toLowerCase() && u.is_active); if (!u || credentials.get(u.email) !== input.password) return fail('invalid_credentials', 401); currentId = u.id; return u }),
    register: input => run(() => { const email = input.email.trim().toLowerCase(); if (data.users.some(u => u.email === email)) fail('email_exists', 409); const u: User = { id: nextId(), email, first_name: input.first_name.trim(), last_name: input.last_name.trim(), role: 'CLIENT', locale: input.locale, phone: null, is_active: true, email_verified_at: null }; data.users.push(u); credentials.set(email, input.password); currentId = u.id; return u }),
    logout: () => run(() => { currentId = null }),
    verifyDemoEmail: () => run(() => { const u = user(['CLIENT']); u.email_verified_at = stamp(); return u }),
    profile: input => asUser(undefined, u => {
      const parsed = profileSchema.safeParse({ ...input, phone: input.phone ?? '' })
      if (!parsed.success) return fail('invalid_profile')
      const { first_name, last_name, phone, locale } = parsed.data
      Object.assign(u, { first_name, last_name, phone: phone || null, locale })
      return u
    }),
    club: () => run(() => clubContent),
    plans: () => run(() => data.plans), trainers: () => run(() => data.trainers.filter(t => data.users.find(u => u.id === t.user_id)?.is_active)), slots: () => run(() => data.slots.map(slotView)),
    memberships: () => asUser(['CLIENT', 'ADMIN'], u => data.memberships.filter(m => u.role === 'ADMIN' || m.client_id === u.id)),
    bookings: () => run(() => { const u = user(); return data.bookings.filter(b => u.role === 'ADMIN' || (u.role === 'TRAINER' ? b.slot.trainer_id === u.id : owner(b) === u.id)).map(bookingView) }),
    book: input => run(() => { const u = user(['CLIENT']); if (!u.email_verified_at) fail('verify_email'); const s = data.slots.find(s => s.id === input.training_slot_id); if (!s) return fail('not_found',404); const m = eligible(s,u.id); if (slotView(s).reserved_count >= s.capacity) fail('slot_full',409); const b: Booking = { id:nextId(),membership_id:m.id,training_slot_id:s.id,status:'pending',created_at:stamp(),client_name:`${u.first_name} ${u.last_name}`,slot:s,requires_attention:false,reason:null }; data.bookings.push(b); notify(u.id,'Заявка отправлена','Request submitted',s.title_ru,s.title_en); notify(s.trainer_id,'Новая заявка','New request',s.title_ru,s.title_en); return bookingView(b) }),
    decide: (key,input) => run(() => { const u = user(); const b = data.bookings.find(b => b.id === key); if (!b) return fail('not_found',404); const s = data.slots.find(s => s.id === b.training_slot_id)!;
      if (u.role === 'CLIENT') { if (owner(b) !== u.id || input.status !== 'cancelled') fail('forbidden',403); if (Date.parse(s.starts_at)-now() < 43_200_000) fail('cancellation_deadline') }
      if (u.role === 'TRAINER' && s.trainer_id !== u.id) fail('forbidden',403)
      const transitions = b.status === 'pending' ? ['approved','rejected','cancelled'] : b.status === 'approved' ? ['cancelled','attended','no_show'] : []
      if (!transitions.includes(input.status)) fail('booking_changed',409)
      if (input.status === 'attended' || input.status === 'no_show') { if (u.role !== 'TRAINER' || Date.parse(s.ends_at) > now()) fail('attendance_too_early') }
      if ((input.status === 'cancelled' || input.status === 'rejected') && !input.reason?.trim()) fail('reason_required')
      if (input.status === 'approved') { eligible(s,owner(b),b.id); if (slotView(s).reserved_count > s.capacity) fail('slot_full',409) }
      b.status = input.status; b.reason = input.reason || null; notify(owner(b),'Статус заявки изменён','Booking updated',s.title_ru,s.title_en); return bookingView(b)
    }),
    createSlot: input => run(() => { const u = user(['TRAINER']); if (!input.title_ru.trim() || !input.title_en.trim() || !Number.isFinite(Date.parse(input.starts_at)) || !Number.isFinite(Date.parse(input.ends_at)) || Date.parse(input.starts_at) <= now() || input.ends_at <= input.starts_at || !Number.isInteger(input.capacity) || input.capacity < 1 || (input.training_type === 'individual' && input.capacity !== 1)) fail('invalid_slot'); const s: Slot = { ...input,id:nextId(),trainer_id:u.id,trainer_name:`${u.first_name} ${u.last_name}`,reserved_count:0,status:'scheduled' }; if (data.slots.some(other=>other.trainer_id===u.id && other.status!=='cancelled' && overlaps(other,s))) fail('trainer_overlap',409); data.slots.push(s); return s }),
    cancelSlot: key => run(() => { const u = user(['TRAINER','ADMIN']); const s = data.slots.find(s=>s.id===key); if (!s) return fail('not_found',404); if (u.role==='TRAINER' && s.trainer_id!==u.id) fail('forbidden',403); if (Date.parse(s.starts_at)<=now() || s.status!=='scheduled') fail('slot_unavailable'); s.status='cancelled'; data.bookings.filter(b=>b.training_slot_id===key && active(b)).forEach(b=>{b.status='cancelled'; b.reason='slot_cancelled'; notify(owner(b),'Тренировка отменена','Training cancelled',s.title_ru,s.title_en)}) }),
    cart: () => run(cart),
    setCartItem: (planId,quantity) => run(() => { const c=cart(); const plan=data.plans.find(p=>p.id===planId && p.is_active); if(!plan) return fail('not_found',404); if(!Number.isInteger(quantity)||quantity<0||quantity>12) fail('invalid_quantity'); c.items=c.items.filter(i=>i.membership_plan_id!==planId); if(quantity) c.items.push({id:nextId(),membership_plan_id:planId,quantity,plan}); c.version++; return c }),
    checkout: input => run(() => { const u=user(['CLIENT']); if(!u.email_verified_at) fail('verify_email'); const requestKey=`${u.id}:${input.idempotency_key}`; const existing=checkouts.get(requestKey); if(existing) return existing; const c=cart(); if(!c.items.length) fail('cart_empty'); if(c.version!==input.cart_version) fail('cart_changed',409); if(c.items.some(i=>!i.plan.is_active)) fail('plan_archived'); const subtotal=c.items.reduce((sum,i)=>sum+cents(i.plan.price_byn)*i.quantity,0); const discount=input.promo_code ? data.discounts.find(d=>d.code===input.promo_code?.trim().toUpperCase() && d.is_active) : null; if(input.promo_code&&!discount) fail('invalid_promo'); const discountCents=discount ? Math.min(subtotal,discount.kind==='percent' ? Math.round(subtotal*Number(discount.value)/100) : cents(discount.value)) : 0; const o: Order={id:nextId(),client_id:u.id,status:'pending',created_at:stamp(),total_byn:amount(subtotal-discountCents),discount_byn:amount(discountCents),items:c.items.map(i=>({name_ru:i.plan.name_ru,name_en:i.plan.name_en,quantity:i.quantity,duration_months:i.plan.duration_months,allows_group:i.plan.allows_group,allows_individual:i.plan.allows_individual,unit_price_byn:i.plan.price_byn}))}; data.orders.unshift(o); checkouts.set(requestKey,o); c.items=[]; c.version++; return o }),
    orders: () => run(() => { const u=user(['CLIENT','ADMIN']); return data.orders.filter(o=>u.role==='ADMIN'||o.client_id===u.id) }),
    pay: (key,input) => run(() => { const u=user(['CLIENT']); const o=data.orders.find(o=>o.id===key&&o.client_id===u.id); if(!o) return fail('not_found',404); const requestKey=`${u.id}:${key}:${input.idempotency_key}`; if(payments.has(requestKey)) return payments.get(requestKey)!; if(o.status==='paid') return o; if(o.status!=='pending') fail('order_changed'); if(!input.successful) { notify(u.id,'Оплата не прошла','Payment failed','Попробуйте снова в истории заказов.','Try again in your order history.'); payments.set(requestKey,structuredClone(o)); return o }
      o.status='paid'; let start=Math.max(now(),...data.memberships.filter(m=>m.client_id===u.id&&!m.cancelled_at).map(m=>Date.parse(m.ends_at)));
      for(const item of o.items) for(let n=0;n<item.quantity;n++) { const startDate=new Date(start+10_800_000); const day=startDate.getUTCDate(); startDate.setUTCDate(1); startDate.setUTCMonth(startDate.getUTCMonth()+item.duration_months); const last=new Date(Date.UTC(startDate.getUTCFullYear(),startDate.getUTCMonth()+1,0)).getUTCDate(); startDate.setUTCDate(Math.min(day,last)); const end=startDate.getTime()-10_800_000; data.memberships.push({id:nextId(),client_id:u.id,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),cancelled_at:null,plan_name_ru:item.name_ru,plan_name_en:item.name_en,allows_group:item.allows_group,allows_individual:item.allows_individual}); start=end }
      payments.set(requestKey,o); notify(u.id,'Абонемент оформлен','Membership issued','Оплата подтверждена. Ваши периоды доступны в кабинете.','Payment confirmed. Your membership periods are in your account.'); return o
    }),
    notifications: () => run(() => { const u=user(); return data.notifications.filter(n=>n.recipient_user_id===u.id) }),
    readNotification: key => run(() => { const u=user(); const n=data.notifications.find(n=>n.id===key&&n.recipient_user_id===u.id); if(!n) return fail('not_found',404); n.read_at=stamp() }),
    users: () => run(() => {user(['ADMIN']);return data.users}),
    setUserActive: (key,is_active) => run(() => {const u=user(['ADMIN']);if(key===u.id) fail('self_deactivation');const target=data.users.find(u=>u.id===key);if(!target)return fail('not_found',404);target.is_active=is_active;return target}),
    setPlanActive: (key,is_active) => run(() => {user(['ADMIN']);const p=data.plans.find(p=>p.id===key);if(!p)return fail('not_found',404);p.is_active=is_active;return p}),
    discounts: () => run(() => {user(['ADMIN']);return data.discounts}), setDiscountActive: (key,is_active) => run(() => {user(['ADMIN']);const d=data.discounts.find(d=>d.id===key);if(!d)return fail('not_found',404);d.is_active=is_active;return d}),
    rates: () => run(() => data.rates),
    analytics: () => run(() => { user(['ADMIN']);return { revenue_byn:amount(data.orders.filter(o=>o.status==='paid').reduce((s,o)=>s+cents(o.total_byn),0)),clients:data.users.filter(u=>u.role==='CLIENT'&&u.is_active).length,active_memberships:data.memberships.filter(m=>!m.cancelled_at&&Date.parse(m.starts_at)<=now()&&Date.parse(m.ends_at)>now()).length,attendance:data.bookings.filter(b=>b.status==='attended').length,weeks:Array.from({length:4},(_,i)=>({label:String(i+1),revenue_byn:amount(data.orders.filter(o=>o.status==='paid'&&now()-Date.parse(o.created_at)>=(3-i)*7*86400000&&now()-Date.parse(o.created_at)<(4-i)*7*86400000).reduce((s,o)=>s+cents(o.total_byn),0))}))} }),
  }
  return api
}
