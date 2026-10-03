import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { api, isMock } from '@/api'
import { ApiError, type Currency } from '@/api/types'
import type { CheckoutInput } from '@/api/commerce-types'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { useCart, useCommerceAction } from './hooks'
import { useCommerceCopy } from './copy'
import { CommerceError, ProductDescription, PurchaseEmpty, PurchaseSteps, Totals } from './shared'

export function CartPage() {
  const { copy } = useCommerceCopy()
  const cart = useCart()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [currency, setCurrency] = useState<Currency>('BYN')
  const [promo, setPromo] = useState('')
  const [applied, setApplied] = useState('')
  const [updated, setUpdated] = useState(false)
  const request = useRef({ fingerprint: '', key: '' })
  const remove = useCommerceAction((id: string) => api.removeCartItem(id, cart.data!.version))
  const refresh = useCommerceAction(() => api.refreshCart(cart.data!.version), () => setUpdated(true))
  const verify = useCommerceAction(() => api.verifyDemoEmail(), user => client.setQueryData(['session'], user))
  const checkout = useCommerceAction((input: CheckoutInput) => api.checkout(input), order => navigate('/account/orders/' + order.id))
  const quote = useQuery({ queryKey: ['account', cart.owner, 'quote', cart.data?.version, applied, currency],
    queryFn: () => api.quote({ cart_version: cart.data!.version, promo_code: applied, currency }), retry: false,
    enabled: !!cart.data?.items.length && !cart.session.isPending && (!cart.session.data || cart.session.data.role === 'CLIENT') })
  const busy = checkout.isPending || remove.isPending || refresh.isPending
  return <section className="container-shell page-section commerce-page">
    <h1 className="page-title">{copy.cart}</h1><p className="commerce-intro">{copy.cartIntro}</p><PurchaseSteps step="cart" />
    {cart.session.data && cart.session.data.role !== 'CLIENT' ? <p>{copy.clientOnlyText}</p> : cart.isPending ? <Loading /> : cart.isError ? <QueryError retry={() => void cart.refetch()} /> : !cart.data.items.length ? <PurchaseEmpty /> : <div className="commerce-grid">
      <div className="commerce-items">{cart.data.items.map(item => <article className="commerce-card" key={item.id}>
        <ProductDescription product={item.product} />
        <div className="commerce-actions"><Button asChild variant="outline" disabled={busy}><Link to={'/plans?edit=' + item.id} onClick={event => { if (busy) event.preventDefault() }}>{copy.edit}</Link></Button><Button variant="ghost" disabled={busy} onClick={() => remove.mutate(item.id)}>{copy.remove}</Button></div>
      </article>)}<CommerceError error={remove.error} /><Link className="underline min-h-11 inline-flex items-center" to="/plans">{copy.browse} ↗</Link></div>
      <aside className="commerce-summary">
        <label htmlFor="pay-currency">{copy.currency}</label><select id="pay-currency" value={currency} disabled={busy} onChange={e => setCurrency(e.target.value as Currency)}>{['BYN', 'USD', 'EUR'].map(value => <option key={value}>{value}</option>)}</select>
        <form onSubmit={e => { e.preventDefault(); const next = promo.trim().toUpperCase(); if (next === applied) void quote.refetch(); else setApplied(next) }}>
          <label htmlFor="promo">{copy.promo}</label><div className="promo-field"><input id="promo" maxLength={40} value={promo} disabled={busy} onChange={e => setPromo(e.target.value)} /><Button type="submit" variant="outline" disabled={busy}>{copy.apply}</Button></div>
          {isMock && <p className="rate-note">{copy.demoPromo}</p>}
          {applied && <button type="button" className="underline min-h-11" disabled={busy} onClick={() => { setApplied(''); setPromo('') }}>{copy.clearPromo}</button>}
        </form>
        {quote.isPending || quote.isFetching ? <Loading /> : quote.isError ? <CommerceError error={quote.error} /> : quote.data && <Totals quote={quote.data} />}
        {quote.error instanceof ApiError && quote.error.code === 'price_changed' && <Button variant="outline" disabled={busy} onClick={() => refresh.mutate()}>{copy.refresh}</Button>}
        {quote.error instanceof ApiError && quote.error.code === 'cart_changed' && <Button variant="outline" onClick={() => void cart.refetch()}>{copy.back}</Button>}
        {updated && <p role="status">{copy.updated}</p>}<CommerceError error={refresh.error} />
        <p className="rate-note">{copy.rateFixed}</p>
        {!cart.session.data ? <><Button asChild><Link to="/login?redirect=/cart">{copy.signIn}</Link></Button><p className="rate-note">{copy.signInNote}</p></> : <>
          {!cart.session.data.email_verified_at && <div className="verify-box"><h2>{copy.verifyTitle}</h2><p>{copy.verifyNote}</p>{isMock && <Button variant="outline" disabled={verify.isPending} onClick={() => verify.mutate()}>{copy.verify}</Button>}<CommerceError error={verify.error} /></div>}
          <CommerceError error={checkout.error} />
          <Button disabled={busy || quote.isFetching || !quote.data || quote.isError || !cart.session.data.email_verified_at} onClick={() => {
            if (!quote.data) return
            const payload = { cart_version: cart.data.version, promo_code: applied, currency, expected_total_byn: quote.data.total_byn, expected_total_currency: quote.data.total_currency, expected_rate: quote.data.byn_per_unit }
            const fingerprint = JSON.stringify(payload)
            if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() }
            checkout.mutate({ ...payload, idempotency_key: request.current.key })
          }}>{checkout.isPending ? copy.loading : copy.createOrder}</Button>
        </>}
      </aside>
    </div>}
    {isMock && <p className="commerce-demo">{copy.demo}</p>}
  </section>
}
