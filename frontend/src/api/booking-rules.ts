import type { Booking, BookingEligibility, Membership, Slot } from './types'
export const cancellationWindow = 12 * 60 * 60 * 1000
export const activeBooking = (booking: Booking) => booking.status === 'pending' || booking.status === 'approved'
export const intervalsOverlap = (a: { starts_at: string; ends_at: string }, b: { starts_at: string; ends_at: string }) => Date.parse(a.starts_at) < Date.parse(b.ends_at) && Date.parse(b.starts_at) < Date.parse(a.ends_at)
export function bookingEligibility(slot: Slot, memberships: Membership[], bookings: Booking[], now: number, excluded?: string): BookingEligibility {
  const blocked = (code: string): BookingEligibility => ({ eligible: false, code, membership_id: null })
  if (slot.status !== 'scheduled' || Date.parse(slot.starts_at) <= now) return blocked('slot_unavailable')
  const valid = memberships.filter(m => !m.cancelled_at && Date.parse(m.starts_at) <= Date.parse(slot.starts_at) && Date.parse(m.ends_at) >= Date.parse(slot.ends_at))
  if (!valid.length) return blocked('membership_required')
  const zone = valid.filter(m => !m.zones || m.zones === 'both' || m.zones === slot.zone)
  if (!zone.length) return blocked('zone_required')
  const membership = zone.find(m => slot.training_type === 'group' ? m.allows_group : m.allows_individual)
  if (!membership) return blocked('training_permission')
  if (bookings.some(b => b.id !== excluded && activeBooking(b) && intervalsOverlap(b.slot, slot))) return blocked('booking_overlap')
  if (slot.reserved_count >= slot.capacity && !excluded) return blocked('slot_full')
  if (slot.reserved_count > slot.capacity) return blocked('slot_full')
  return { eligible: true, code: null, membership_id: membership.id }
}
export function canCancel(booking: Booking, now: number) {
  return activeBooking(booking) && Date.parse(booking.slot.starts_at) - now >= cancellationWindow
}
