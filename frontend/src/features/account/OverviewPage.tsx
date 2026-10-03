import { Link } from 'react-router'
import { api } from '@/api'
import { accessStatus } from '@/api/commerce-rules'
import { activeBooking } from '@/api/booking-rules'
import { money, localized } from '@/lib/format'
import { Loading, QueryError } from '@/components/feedback'
import { ZoneBadges } from '@/features/commerce/shared'
import { AccessBadge } from '@/features/commerce/AccessPage'
import { useCommerceCopy } from '@/features/commerce/copy'
import { useTrainingCopy } from '@/features/training/copy'
import { useClock, usePrivateQuery } from '@/features/training/hooks'
import { BookingCard } from '@/features/training/shared'
import { DemoAuth } from '@/features/auth/DemoAuth'

export function OverviewPage() {
  const { copy, locale } = useTrainingCopy()
  const { copy: commerce } = useCommerceCopy()
  const now = useClock()
  const access = usePrivateQuery(['accesses'], api.accesses)
  const bookings = usePrivateQuery(['bookings'], api.bookings)
  const orders = usePrivateQuery(['orders'], api.orders)
  const notifications = usePrivateQuery(['notifications'], api.notifications)
  const queries = [access, bookings, orders, notifications]
  const next = bookings.data?.filter(b => activeBooking(b) && Date.parse(b.slot.starts_at) > now).sort((a,b) => a.slot.starts_at.localeCompare(b.slot.starts_at))[0]
  const current = access.data?.filter(a => ['active', 'pending', 'unused'].includes(accessStatus(a, now))).sort((a,b) => a.starts_at.localeCompare(b.starts_at)) || []
  return <section className="training-page"><h1 className="page-title">{copy.overview}</h1><p className="commerce-intro">{copy.welcome}</p>
    {queries.some(q => q.isPending) ? <Loading /> : queries.some(q => q.isError) ? <QueryError retry={() => queries.forEach(q => void q.refetch())} /> : <>
      <div className="account-metrics"><Link to="/account/memberships">{copy.currentAccess}<strong>{current.length}</strong></Link><Link to="/account/bookings">{copy.upcoming}<strong>{bookings.data?.filter(b => activeBooking(b) && Date.parse(b.slot.starts_at) > now).length}</strong></Link><Link to="/account/notifications">{copy.unread}<strong>{notifications.data?.filter(n => !n.read_at).length}</strong></Link></div>
      <section className="overview-section"><div className="commerce-row"><h2>{copy.nextBooking}</h2><Link className="training-link" to="/schedule">{copy.schedule} ↗</Link></div>{next ? <BookingCard booking={next} /> : <p>{copy.none}</p>}</section>
      <section className="overview-section"><div className="commerce-row"><h2>{copy.currentAccess}</h2><Link className="training-link" to="/account/memberships">{copy.openAll} ↗</Link></div><div className="commerce-items">{current.slice(0,3).map(a => <article className="commerce-card" key={a.id}><h3>{a.format === 'membership' ? commerce.memberships : commerce.passes}</h3><AccessBadge access={a} now={now} /><ZoneBadges zones={a.zones} /><Link className="training-link" to={'/account/access/' + a.id}>{commerce.details} ↗</Link></article>)}</div>{!current.length && <Link className="training-link" to="/plans">{copy.choose} ↗</Link>}</section>
      <section className="overview-section"><div className="commerce-row"><h2>{copy.latestOrders}</h2><Link className="training-link" to="/account/orders">{copy.openAll} ↗</Link></div>{!orders.data?.length ? <p>{copy.none}</p> : orders.data.slice(0,3).map(o => <Link key={o.id} className="overview-row" to={'/account/orders/' + o.id}><span>{commerce.order} #{o.id} · {commerce[o.status]}</span><strong>{money(o.total_currency, locale, o.currency)}</strong></Link>)}</section>
      <section className="overview-section"><div className="commerce-row"><h2>{copy.latestNotifications}</h2><Link className="training-link" to="/account/notifications">{copy.openAll} ↗</Link></div>{!notifications.data?.length ? <p>{copy.none}</p> : notifications.data.slice(0,3).map(n => <p key={n.id}>{localized(n, 'title', locale)} · {n.read_at ? copy.read : copy.unread}</p>)}</section>
    </>}
    <DemoAuth />
  </section>
}
