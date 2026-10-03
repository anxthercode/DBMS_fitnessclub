const accountDestinations = new Set(['/account', '/account/profile', '/account/memberships', '/account/orders', '/cart'])

export function accountDestination(value: string | null): string {
  return value && (accountDestinations.has(value) || /^\/account\/(?:orders\/\d+|access\/(?:membership|visit)-(?:demo-)?[a-zA-Z0-9]+)$/.test(value)) ? value : '/account/memberships'
}
