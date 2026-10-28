import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useOutletContext, useParams } from 'react-router'
import { purchaseLink } from '@/features/memberships/purchase-link'
import { useTrainingCopy } from '@/features/training/copy'
import { api, showTestControls } from '@/api'
import type { User } from '@/api/types'
import { date, money } from '@/lib/format'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { useCommerceAction } from './hooks'
import { useCommerceCopy } from './copy'
import { CommerceError, ProductDescription, PurchaseEmpty, PurchaseSteps, Totals } from './shared'

export function OrdersPage() {
  const user = useOutletContext<User>()
  const { copy, locale } = useCommerceCopy()
  const orders = useQuery({ queryKey: ['account', user.id, 'orders'], queryFn: api.orders, retry: false })
  return <section className="commerce-page"><h1 className="page-title">{copy.orders}</h1><p className="commerce-intro">{copy.ordersIntro}</p>
    {orders.isPending ? <Loading /> : orders.isError ? <QueryError retry={() => void orders.refetch()} /> : !orders.data.length ? <PurchaseEmpty orders /> : <div className="commerce-items">{orders.data.map(order => <article className="commerce-card" key={order.id}>
      <div className="commerce-row"><h2>{copy.order} #{order.id}</h2><span className="status-badge">{copy[order.status]}</span></div>
      <p>{date(order.created_at, locale)}</p><p className="product-price">{money(order.total_currency, locale, order.currency)}</p><Link className="underline min-h-11 inline-flex items-center" to={'/account/orders/' + order.id}>{copy.details} ↗</Link>
    </article>)}</div>}
  </section>
}

export function OrderPage() {
  const { copy: training } = useTrainingCopy()
  const user = useOutletContext<User>()
  const { id = '' } = useParams()
  const { copy, locale } = useCommerceCopy()
  const order = useQuery({ queryKey: ['account', user.id, 'order', id], queryFn: () => api.order(id), retry: false })
  const [successful, setSuccessful] = useState(true)
  const attempt = useRef({ key: crypto.randomUUID(), successful: true })
  const pay = useCommerceAction((input: { successful: boolean; idempotency_key: string }) => api.pay(id, input), () => { attempt.current.key = crypto.randomUUID() })
  const cancel = useCommerceAction(() => api.cancelOrder(id))
  if (order.isPending) return <Loading />
  if (order.isError) return <><CommerceError error={order.error} /><Link to="/account/orders" className="underline">{copy.orders}</Link></>
  const data = order.data
  const hasTraining = data.items.some(item => item.product.format === 'training')
  const accessItems = data.items.filter(item => item.product.format !== 'training')
  const hasAccess = accessItems.length > 0
  const singleVisit = accessItems.length === 1 && accessItems[0].product.format === 'single_visit'
  const accessLabel = accessItems.length === 1 ? singleVisit ? copy.openVisit : copy.openMembership : copy.openPurchases
  const accessUrl = data.access_ids.length === 1 ? '/account/access/' + data.access_ids[0] : '/account/memberships'
  const successTitle = hasTraining ? hasAccess ? copy.mixedSuccess : copy.trainingSuccess : accessItems.length === 1 ? singleVisit ? copy.visitSuccess : copy.membershipSuccess : copy.success
  const lastAttempt = data.attempts.at(-1)
  const busy = pay.isPending || cancel.isPending
  return <section className="commerce-page">
    <Link className="underline" to="/account/orders">← {copy.orders}</Link><h1 className="page-title mt-6">{copy.order} #{data.id}</h1><p className="commerce-intro">{copy[data.status]} · {date(data.created_at, locale)}</p>
    {data.status === 'pending' && <PurchaseSteps step="payment" />}
    {data.status === 'paid' && <div className="payment-success receipt-success">
      <div role="status"><h2>{successTitle}</h2></div>
      <div className="commerce-actions">
        {hasTraining && <Button asChild><Link to="/schedule">{copy.chooseTime} <span aria-hidden="true">↗</span></Link></Button>}
        {hasAccess && <Button asChild variant={hasTraining ? 'outline' : 'default'}><Link to={accessUrl}>{accessLabel} <span aria-hidden="true">↗</span></Link></Button>}
      </div>
      {hasTraining && <p>{copy.trainingNext}</p>}
      {hasAccess && <p>{copy.accessIntro}</p>}
    </div>}

    <div className="commerce-grid order-grid"><div className="commerce-items">{data.items.map(item => <article key={item.id} className="commerce-card"><ProductDescription product={item.product} showPrice={data.items.length > 1 || data.status !== 'paid'} showNotes={data.status !== 'paid'} />{data.status === 'paid' && <Link className="underline min-h-11 inline-flex items-center" to={item.product.format === 'training' ? '/training' : purchaseLink(item.product)}>{training.repeat} ↗</Link>}</article>)}</div><aside className="commerce-summary"><Totals quote={data} status={data.status} /></aside></div>
    {data.status === 'pending' && <div className="commerce-card payment-panel">
      <h2>{copy.payment}</h2>
      {lastAttempt?.status === 'failed' && <div role="status"><p>{copy.failed}</p><CommerceError error={lastAttempt.reason} /></div>}
      {showTestControls && <fieldset disabled={busy}><legend className="sr-only">{copy.payment}</legend><div className="payment-options">{[true, false].map(value => <label key={String(value)}><input type="radio" name="payment-outcome" checked={successful === value} onChange={() => setSuccessful(value)} />{value ? copy.successChoice : copy.failureChoice}</label>)}</div></fieldset>}
      <div className="commerce-actions"><Button disabled={busy} onClick={() => {
        if (attempt.current.successful !== successful) attempt.current = { key: crypto.randomUUID(), successful }
        pay.mutate({ successful, idempotency_key: attempt.current.key })
      }}>{pay.isPending ? copy.loading : data.attempts.length ? copy.retry : copy.pay + ' ' + money(data.total_currency, locale, data.currency)}</Button><Button variant="outline" disabled={busy} onClick={() => cancel.mutate()}>{copy.cancelOrder}</Button></div>
      <CommerceError error={pay.error || cancel.error} />
    </div>}
    {data.status === 'cancelled' && <p role="status" className="commerce-intro">{copy.cancelledOrder}</p>}
    {!!data.attempts.length && <details className="commerce-card payment-panel purchase-details"><summary>{copy.attempts} ({data.attempts.length})</summary><ol>{data.attempts.map((item, i) => <li className="attempt-row" key={item.id}><p>{i + 1}. {date(item.created_at, locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {item.status === 'succeeded' ? copy.succeeded : copy.declined}</p>{item.reason && <p>{copy.errors[item.reason as keyof typeof copy.errors] || copy.errors.unknown}</p>}</li>)}</ol></details>}
  </section>
}
