import type { Slot } from '@/api/types'
import { localDay } from '@/lib/format'

// Calendar arithmetic uses UTC noon; booking times themselves remain in Minsk.
export function shiftDay(day: string, offset: number) {
  const value = new Date(day + 'T12:00:00Z')
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}
export function weekStart(day: string) {
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay()
  return shiftDay(day, -((weekday + 6) % 7))
}
export function validDay(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function nearestDay(slots: Slot[], today: string) {
  return localDay((slots.find(s => s.reserved_count < s.capacity) || slots[0])?.starts_at || today + 'T12:00:00Z')
}
