const accountDestinations = new Set(['/account', '/account/profile', '/account/memberships', '/account/orders', '/cart', '/account/bookings', '/account/notifications'])

export function accountDestination(value: string | null): string {
  return value && (accountDestinations.has(value) || /^\/account\/(?:(?:orders|bookings)\/\d+|access\/(?:membership|visit)-(?:demo-)?[a-zA-Z0-9]+)$/.test(value) || /^\/schedule\/\d+$/.test(value)) ? value : '/account'
}
