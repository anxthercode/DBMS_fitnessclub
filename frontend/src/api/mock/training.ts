import { ApiError, type Booking, type ClubApi, type Membership, type Notification, type Role, type Slot, type User } from '../types'
import { activeBooking, bookingEligibility, canCancel, intervalsOverlap } from '../booking-rules'

type TrainingMethods = Pick<ClubApi, 'slots' | 'bookings' | 'booking' | 'eligibility' | 'book' | 'decide' | 'demoDecision' | 'createSlot' | 'cancelSlot' | 'notifications' | 'readNotification'>
interface State { users: User[]; memberships: Membership[]; bookings: Booking[]; slots: Slot[]; notifications: Notification[] }
interface Context {
  now(): number; nextId(): string; run<T>(fn: () => T): Promise<T>
  asUser<T>(roles: Role[] | undefined, fn: (user: User) => T): Promise<T>
  notify(recipient: string, ru: string, en: string, bodyRu: string, bodyEn: string, target?: Notification['target']): unknown
}
export function createTraining(data: State, ctx: Context): TrainingMethods {
  const fail = (code: string, status = 400): never => { throw new ApiError(code, status) }
  const owner = (b: Booking) => data.memberships.find(m => m.id === b.membership_id)!.client_id
  const slotView = (s: Slot): Slot => ({ ...s, reserved_count: data.bookings.filter(b => b.training_slot_id === s.id && activeBooking(b)).length })
  const getSlot = (id: string) => data.slots.find(s => s.id === id) || fail('not_found', 404)
  const view = (b: Booking): Booking => ({ ...b, slot: slotView(getSlot(b.training_slot_id)), requires_attention: b.status === 'pending' && (ctx.now() - Date.parse(b.created_at) >= 43_200_000 || Date.parse(getSlot(b.training_slot_id).starts_at) <= ctx.now()) })
  const own = (u: User, id: string) => {
    const b = data.bookings.find(b => b.id === id && (u.role === 'ADMIN' || (u.role === 'TRAINER' ? getSlot(b.training_slot_id).trainer_id === u.id : owner(b) === u.id)))
    return b || fail('not_found', 404)
  }
  const check = (s: Slot, clientId: string, excluded?: string) => {
    const client = data.users.find(u => u.id === clientId && u.is_active)
    if (!client) return { eligible: false, code: 'unauthorized', membership_id: null }
    if (!client.email_verified_at) return { eligible: false, code: 'verify_email', membership_id: null }
    if (!data.users.find(u => u.id === s.trainer_id && u.is_active)) return { eligible: false, code: 'slot_unavailable', membership_id: null }
    return bookingEligibility(slotView(s), data.memberships.filter(m => m.client_id === clientId), data.bookings.filter(b => owner(b) === clientId).map(view), ctx.now(), excluded)
  }
  const notifyBooking = (b: Booking) => {
    const s = getSlot(b.training_slot_id)
    const titles = {
      pending: ['Заявка отправлена', 'Request submitted'], approved: ['Заявка подтверждена', 'Booking approved'], rejected: ['Заявка отклонена', 'Booking rejected'], cancelled: ['Запись отменена', 'Booking cancelled'], attended: ['Тренировка завершена', 'Session completed'], no_show: ['Отмечена неявка', 'No-show recorded'],
    }
    const [ru, en] = titles[b.status]
    ctx.notify(owner(b), ru, en, s.title_ru, s.title_en, { kind: 'booking', id: b.id })
    ctx.notify(s.trainer_id, 'Изменение заявки', 'Booking update', s.title_ru, s.title_en, { kind: 'booking', id: b.id })
  }
  const decide = (b: Booking, status: string, reason?: string) => {
    const transitions = b.status === 'pending' ? ['approved', 'rejected', 'cancelled'] : b.status === 'approved' ? ['cancelled', 'attended', 'no_show'] : []
    if (!transitions.includes(status)) fail('booking_changed', 409)
    if (status === 'approved') {
      const result = check(getSlot(b.training_slot_id), owner(b), b.id)
      if (!result.eligible) fail(result.code!, 409)
      // Approval validates the original membership too; it never silently switches entitlements.
      if (result.membership_id !== b.membership_id) fail('membership_required')
    }
    if (['rejected', 'cancelled'].includes(status) && (!reason?.trim() || reason.length > 500)) fail('reason_required')
    b.status = status as Booking['status']; b.reason = reason?.trim() || null
    notifyBooking(b)
    return view(b)
  }
  return {
    slots: () => ctx.run(() => data.slots.map(slotView)),
    bookings: () => ctx.asUser(undefined, u => data.bookings.filter(b => u.role === 'ADMIN' || (u.role === 'TRAINER' ? getSlot(b.training_slot_id).trainer_id === u.id : owner(b) === u.id)).map(view)),
    booking: id => ctx.asUser(undefined, u => view(own(u, id))),
    eligibility: id => ctx.asUser(['CLIENT'], u => check(getSlot(id), u.id)),
    book: input => ctx.asUser(['CLIENT'], u => {
      const s = getSlot(input.training_slot_id)
      const result = check(s, u.id)
      if (!result.eligible) fail(result.code!, 409)
      const b: Booking = { id: ctx.nextId(), membership_id: result.membership_id!, training_slot_id: s.id, status: 'pending', created_at: new Date(ctx.now()).toISOString(), client_name: u.first_name + ' ' + u.last_name, slot: s, requires_attention: false, reason: null }
      data.bookings.push(b); notifyBooking(b); return view(b)
    }),
    decide: (id, input) => ctx.asUser(undefined, u => {
      const b = own(u, id)
      if (u.role === 'CLIENT') {
        if (input.status !== 'cancelled') fail('forbidden', 403)
        if (!canCancel(view(b), ctx.now())) fail(activeBooking(b) ? 'cancellation_deadline' : 'booking_changed', 409)
      }
      if (input.status === 'attended' || input.status === 'no_show') {
        if (u.role !== 'TRAINER' || Date.parse(getSlot(b.training_slot_id).ends_at) > ctx.now()) fail('attendance_too_early')
      }
      return decide(b, input.status, input.reason)
    }),
    // Explicit demo endpoint, absent from the HTTP adapter. A client can simulate only their own pending request.
    demoDecision: (id, input) => ctx.asUser(['CLIENT'], u => {
      const b = own(u, id)
      if (!['approved', 'rejected'].includes(input.status)) fail('invalid_request')
      return decide(b, input.status, input.status === 'rejected' ? 'demo_rejected' : undefined)
    }),
    createSlot: input => ctx.asUser(['TRAINER'], u => {
      if (!['gym', 'pool'].includes(input.zone) || !['group', 'individual'].includes(input.training_type) || !input.title_ru.trim() || !input.title_en.trim() || !Number.isFinite(Date.parse(input.starts_at)) || !Number.isFinite(Date.parse(input.ends_at)) || Date.parse(input.starts_at) <= ctx.now() || Date.parse(input.ends_at) <= Date.parse(input.starts_at) || !Number.isInteger(input.capacity) || input.capacity < 1 || (input.training_type === 'individual' && input.capacity !== 1)) fail('invalid_slot')
      if (data.slots.some(s => s.trainer_id === u.id && s.status !== 'cancelled' && intervalsOverlap(s, input))) fail('trainer_overlap', 409)
      const s: Slot = { ...input, id: ctx.nextId(), trainer_id: u.id, trainer_name: u.first_name + ' ' + u.last_name, status: 'scheduled', reserved_count: 0 }
      data.slots.push(s); return s
    }),
    cancelSlot: id => ctx.asUser(['TRAINER', 'ADMIN'], u => {
      const s = getSlot(id)
      if (u.role === 'TRAINER' && s.trainer_id !== u.id) fail('forbidden', 403)
      if (Date.parse(s.starts_at) <= ctx.now() || s.status !== 'scheduled') fail('slot_unavailable')
      s.status = 'cancelled'
      data.bookings.filter(b => b.training_slot_id === id && activeBooking(b)).forEach(b => decide(b, 'cancelled', 'slot_cancelled'))
    }),
    notifications: () => ctx.asUser(undefined, u => data.notifications.filter(n => n.recipient_user_id === u.id)),
    readNotification: id => ctx.asUser(undefined, u => {
      const n = data.notifications.find(n => n.id === id && n.recipient_user_id === u.id)
      if (!n) fail('not_found', 404)
      n!.read_at ||= new Date(ctx.now()).toISOString()
    }),
  }
}
