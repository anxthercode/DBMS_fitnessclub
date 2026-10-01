const accountDestinations = new Set(['/account', '/account/profile', '/account/memberships'])

export function accountDestination(value: string | null): string {
  return value && accountDestinations.has(value) ? value : '/account/memberships'
}
