import { describe, expect, it } from 'vitest'
import type { Slot } from '@/api/types'
import { nearestDay, shiftDay, validDay, weekStart } from '@/features/training/schedule-days'

describe('schedule calendar', () => {
  it('keeps Monday weeks correct across year and leap-day boundaries', () => {
    expect(weekStart('2027-01-03')).toBe('2026-12-28')
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29')
    expect(shiftDay('2028-02-29', 1)).toBe('2028-03-01')
    expect(validDay('2026-02-30')).toBe(false)
    expect(validDay('invalid')).toBe(false)
    expect(validDay('2028-02-29')).toBe(true)
  })
  it('opens the nearest available Minsk day, with full and empty fallbacks', () => {
    const full = { starts_at: '2026-10-28T20:00:00Z', capacity: 1, reserved_count: 1 } as Slot
    const available = { starts_at: '2026-10-29T21:30:00Z', capacity: 1, reserved_count: 0 } as Slot
    expect(nearestDay([full, available], '2026-10-28')).toBe('2026-10-30')
    expect(nearestDay([full], '2026-10-28')).toBe('2026-10-28')
    expect(nearestDay([], '2026-10-28')).toBe('2026-10-28')
  })
})
