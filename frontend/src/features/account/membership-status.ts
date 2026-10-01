import type { Membership } from '@/api/types'

export type MembershipStatus = 'active' | 'pending' | 'expired' | 'cancelled'

// Membership periods are half-open: [starts_at, ends_at).
export function membershipStatus(membership: Membership, now: number): MembershipStatus {
  if (membership.cancelled_at) return 'cancelled'
  if (now < Date.parse(membership.starts_at)) return 'pending'
  if (now >= Date.parse(membership.ends_at)) return 'expired'
  return 'active'
}

const priority: Record<MembershipStatus, number> = { active: 0, pending: 1, expired: 2, cancelled: 3 }

export function sortMemberships(memberships: Membership[], now: number) {
  return [...memberships].sort((a, b) => {
    const statusA = membershipStatus(a, now)
    const rank = priority[statusA] - priority[membershipStatus(b, now)]
    if (rank) return rank
    return statusA === 'pending'
      ? Date.parse(a.starts_at) - Date.parse(b.starts_at)
      : Date.parse(b.starts_at) - Date.parse(a.starts_at)
  })
}
