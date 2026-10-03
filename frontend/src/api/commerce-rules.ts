import { ApiError, type Money } from './types'
import type { AccessGrant, Product, Selection, Zones } from './commerce-types'

export const cents = (value: Money) => Math.round(Number(value) * 100)
export const amount = (value: number) => (value / 100).toFixed(2)
export function minskDay(now = Date.now()) { return new Date(now + 10_800_000).toISOString().slice(0, 10) }
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= '9998-12-31' &&
    Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
}
export function validateSelection(selection: Selection, now: number) {
  if (!selection || !['gym', 'pool', 'both'].includes(selection.zones)) throw new ApiError('zones_required')
  if (!validDate(selection.date) || selection.date < minskDay(now)) throw new ApiError('invalid_date')
  if (selection.format === 'membership' ? ![1, 3, 12].includes(selection.months) : selection.format !== 'single_visit' || selection.months !== null) throw new ApiError('offer_unavailable')
}
export function period(selection: Selection) {
  const start = new Date(selection.date + 'T00:00:00Z')
  const end = new Date(start)
  if (selection.format === 'single_visit') end.setUTCDate(end.getUTCDate() + 1)
  else {
    const day = start.getUTCDate()
    end.setUTCDate(1)
    end.setUTCMonth(end.getUTCMonth() + selection.months)
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
    end.setUTCDate(Math.min(day, last))
  }
  return { starts_at: new Date(+start - 10_800_000).toISOString(), ends_at: new Date(+end - 10_800_000).toISOString() }
}
export const zonesOverlap = (a: Zones, b: Zones) => a === 'both' || b === 'both' || a === b
export function assertNoMembershipOverlap(products: Product[], existing: AccessGrant[]) {
  const intervals = existing.filter(a => a.format === 'membership' && !a.cancelled_at)
  for (const product of products.filter(p => p.format === 'membership')) {
    if (intervals.some(a => zonesOverlap(a.zones, product.zones) && a.starts_at < product.ends_at && product.starts_at < a.ends_at)) throw new ApiError('membership_overlap', 409)
    intervals.push({ ...product, id: '', client_id: '', cancelled_at: null, redeemed_at: null, order_id: null, product })
  }
}
export function accessStatus(access: AccessGrant, now: number) {
  if (access.cancelled_at) return 'cancelled'
  if (access.format === 'single_visit' && access.redeemed_at) return 'used'
  if (now >= Date.parse(access.ends_at)) return 'expired'
  if (access.format === 'single_visit') return 'unused'
  return now < Date.parse(access.starts_at) ? 'pending' : 'active'
}
