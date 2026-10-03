import type { AccessGrant, Product, Selection } from '@/api/commerce-types'
import { minskDay, validDate } from '@/api/commerce-rules'

export function purchaseLink(product: Product | AccessGrant, renew = false, now = Date.now()) {
  const today = minskDay(now)
  let date = today
  if (renew) {
    const end = Date.parse(product.ends_at)
    const day = minskDay(end)
    const midnight = Date.parse(day + 'T00:00:00+03:00')
    date = minskDay(midnight + (end > midnight ? 86_400_000 : 0))
    if (date < today) date = today
  }
  const months = 'months' in product ? product.months : product.product?.months || 3
  const params = new URLSearchParams({ format: product.format, zones: product.zones, date, ...(product.format === 'membership' ? { months: String(months) } : {}), repeat: renew ? 'renew' : 'again' })
  return '/plans?' + params
}
export function selectionFromParams(params: URLSearchParams): Selection | undefined {
  const format = params.get('format'), zones = params.get('zones'), date = params.get('date'), months = Number(params.get('months'))
  if (!zones || !['gym', 'pool', 'both'].includes(zones) || !date || !validDate(date)) return undefined
  if (format === 'membership' && [1, 3, 12].includes(months)) return { format, zones, date, months } as Selection
  if (format === 'single_visit') return { format, zones, date, months: null } as Selection
  return undefined
}
