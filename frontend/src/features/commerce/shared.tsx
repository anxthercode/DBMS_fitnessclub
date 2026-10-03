import { Link } from 'react-router'
import { ApiError } from '@/api/types'
import type { Product, Quote, Zones } from '@/api/commerce-types'
import { money, date } from '@/lib/format'
import { offerCopy } from '@/features/memberships/offer-copy'
import { useCommerceCopy } from './copy'
import './commerce.css'

export function CommerceError({ error }: { error: Error | string | null }) {
  const { copy } = useCommerceCopy()
  if (!error) return null
  const code = typeof error === 'string' ? error : error instanceof ApiError ? error.code : 'unknown'
  return <p role="alert" className="commerce-error">{copy.errors[code as keyof typeof copy.errors] || copy.errors.unknown}</p>
}
export function ZoneBadges({ zones }: { zones: Zones }) {
  const { locale } = useCommerceCopy()
  return <div className="zone-badges">{(zones === 'both' ? ['gym', 'pool'] as const : [zones]).map(zone => <span key={zone}>{offerCopy[locale][zone]}</span>)}</div>
}
export function ProductDescription({ product }: { product: Product }) {
  const { copy, locale } = useCommerceCopy()
  const offer = offerCopy[locale]
  return <div className="product-description">
    <h2>{offer[product.format]}{product.format === 'membership' ? ' · ' + offer['month' + product.months as 'month1'] : ''}</h2>
    <ZoneBadges zones={product.zones} />
    <p>{product.format === 'membership' ? offer.startDate : offer.visitDate}: <time dateTime={product.starts_at}>{date(product.starts_at, locale, { day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
    {product.format === 'membership' && <p>{copy.ends}: <time dateTime={product.ends_at}>{date(product.ends_at, locale, { day: 'numeric', month: 'long', year: 'numeric' })}</time></p>}
    <p>{product.format === 'membership' && copy.coaching + ': '}{product.format === 'membership' ? (product.allows_individual ? copy.individual : product.allows_group ? copy.group : copy.independent) : offer.visitTraining}</p>
    <p className="product-price">{money(product.price_byn, locale)} <small>{product.format === 'membership' ? offer.total : offer.visitTotal}</small></p>
  </div>
}
export function Totals({ quote }: { quote: Quote }) {
  const { copy, locale } = useCommerceCopy()
  return <div className="purchase-totals">
    <dl><div><dt>{copy.subtotal}</dt><dd>{money(quote.subtotal_byn, locale)}</dd></div><div><dt>{copy.discount}{quote.promo_code && ' · ' + quote.promo_code}</dt><dd>−{money(quote.discount_byn, locale)}</dd></div></dl>
    {quote.currency !== 'BYN' && <><p>{copy.baseTotal}: {money(quote.total_byn, locale)}</p><p className="rate-note">{copy.conversion}: 1 {quote.currency} = {Number(quote.byn_per_unit)} BYN{quote.rate_date && ' · ' + date(quote.rate_date, locale, { day: 'numeric', month: 'numeric', year: 'numeric' })}</p></>}
    <p className="total-label">{copy.total}</p><p className="purchase-total">{money(quote.total_currency, locale, quote.currency)}</p>
  </div>
}
export function PurchaseSteps({ step }: { step: 'selection' | 'cart' | 'payment' | 'access' }) {
  const { copy } = useCommerceCopy()
  return <ol className="purchase-steps">{(['selection', 'cart', 'payment', 'access'] as const).map(key => <li key={key} aria-current={key === step ? 'step' : undefined}>{copy[(key === 'selection' ? 'selectionStep' : key + 'Step') as 'selectionStep']}</li>)}</ol>
}
export function PurchaseEmpty({ orders = false }: { orders?: boolean }) {
  const { copy } = useCommerceCopy()
  return <div className="commerce-empty"><h2>{orders ? copy.noOrders : copy.empty}</h2><p>{copy.emptyText}</p><Link className="site-link underline" to="/plans">{copy.browse} ↗</Link></div>
}
