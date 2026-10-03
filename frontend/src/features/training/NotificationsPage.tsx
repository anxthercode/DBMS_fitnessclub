import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '@/api'
import { date, localized } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { useTrainingCopy } from './copy'
import { usePrivateQuery, useTrainingAction } from './hooks'
import { TrainingError } from './shared'

export function NotificationsPage() {
  const { copy, locale } = useTrainingCopy()
  const notifications = usePrivateQuery(['notifications'], api.notifications)
  const [unread, setUnread] = useState(false)
  const mark = useTrainingAction((id: string) => api.readNotification(id))
  const items = notifications.data?.filter(n => !unread || !n.read_at) || []
  return <section className="training-page"><h1 className="page-title">{copy.notifications}</h1><div className="commerce-actions" role="group" aria-label={copy.notifications}><button className="choice-pill" aria-pressed={!unread} onClick={() => setUnread(false)}>{copy.all}</button><button className="choice-pill" aria-pressed={unread} onClick={() => setUnread(true)}>{copy.unread} ({notifications.data?.filter(n => !n.read_at).length || 0})</button></div>
    {notifications.isPending ? <Loading /> : notifications.isError ? <QueryError retry={() => void notifications.refetch()} /> : !items.length ? <p className="commerce-empty mt-6">{copy.noNotifications}</p> : <div className="commerce-items mt-6">{items.map(n => <article key={n.id} className="commerce-card notification-card"><div className="commerce-row"><h2>{localized(n, 'title', locale)}</h2><span className="status-badge">{n.read_at ? copy.read : copy.unread}</span></div><p>{localized(n, 'body', locale)}</p><p>{date(n.created_at, locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p><div className="commerce-actions">{n.target && <Link className="training-link" to={'/account/' + (n.target.kind === 'booking' ? 'bookings/' : 'orders/') + encodeURIComponent(n.target.id)}>{copy.related} ↗</Link>}{!n.read_at && <Button variant="outline" disabled={mark.isPending} onClick={() => mark.mutate(n.id)}>{copy.markRead}</Button>}</div></article>)}</div>}<TrainingError error={mark.error} />
  </section>
}
