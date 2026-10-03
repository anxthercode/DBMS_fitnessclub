import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, isMock } from '@/api'
import { activeBooking, canCancel } from '@/api/booking-rules'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { useTrainingCopy } from './copy'
import { useClock, usePrivateQuery, useTrainingAction } from './hooks'
import { BookingCard, SlotSummary, TrainingError } from './shared'

export function BookingsPage() {
  const { copy } = useTrainingCopy()
  const bookings = usePrivateQuery(['bookings'], api.bookings)
  const now = useClock()
  const [filter, setFilter] = useState('all')
  const visible = bookings.data?.filter(b => filter === 'all' || (filter === 'upcoming' ? activeBooking(b) && Date.parse(b.slot.ends_at) > now : !activeBooking(b) || Date.parse(b.slot.ends_at) <= now)).sort((a, b) => b.created_at.localeCompare(a.created_at)) || []
  return <section className="training-page"><h1 className="page-title">{copy.bookings}</h1><p className="commerce-intro">{copy.cancelRule}</p><Link className="training-link" to="/schedule">{copy.schedule} ↗</Link>
    <div className="commerce-actions" role="group" aria-label={copy.bookings}>{(['all', 'upcoming', 'history'] as const).map(key => <button className="choice-pill" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{copy[key]}</button>)}</div>
    {bookings.isPending ? <Loading /> : bookings.isError ? <QueryError retry={() => void bookings.refetch()} /> : !visible.length ? <p className="commerce-empty mt-6">{copy.noBookings}</p> : <div className="commerce-items mt-6">{visible.map(b => <BookingCard key={b.id} booking={b} />)}</div>}
  </section>
}
export function BookingPage() {
  const { id = '' } = useParams()
  const { copy } = useTrainingCopy()
  const now = useClock()
  const booking = usePrivateQuery(['booking', id], () => api.booking(id))
  const [reason, setReason] = useState('')
  const cancel = useTrainingAction(() => api.decide(id, { status: 'cancelled', reason }))
  const simulate = useTrainingAction((status: 'approved' | 'rejected') => api.demoDecision(id, { status }))
  if (booking.isPending) return <Loading />
  if (booking.isError) return <><TrainingError error={booking.error} /><Link className="training-link" to="/account/bookings">{copy.bookings}</Link></>
  const b = booking.data
  const busy = cancel.isPending || simulate.isPending
  return <section className="training-page"><Link className="training-link" to="/account/bookings">← {copy.bookings}</Link><h1 className="page-title">{copy.booking} #{b.id}</h1>
    <article className="commerce-card mt-8"><p className="booking-state" aria-live="polite">{copy.current}: <strong>{copy[b.status]}</strong></p><SlotSummary slot={b.slot} />
      {b.reason && <p>{b.reason === 'demo_rejected' || b.reason === 'slot_cancelled' ? copy[b.reason] : b.reason}</p>}
      {b.requires_attention && <p>{copy.attention}</p>}<Link className="training-link" to={'/account/access/membership-' + b.membership_id}>{copy.membership} ↗</Link>
    </article>
    {activeBooking(b) && <div className="commerce-card mt-6"><h2>{copy.cancel}</h2><p>{copy.cancelRule}</p>{canCancel(b, now) ? <form onSubmit={e => { e.preventDefault(); cancel.mutate() }}><label className="training-label" htmlFor="cancel-reason">{copy.reason}</label><textarea id="cancel-reason" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /><Button className="mt-4" variant="outline" disabled={busy || !reason.trim()}>{cancel.isPending ? copy.busy : copy.cancel}</Button></form> : <p>{copy.late}</p>}<TrainingError error={cancel.error} /></div>}
    {isMock && b.status === 'pending' && <div className="demo-scenario mt-6"><h2>{copy.demo}</h2><p>{copy.demoNote}</p><div className="commerce-actions"><Button variant="outline" disabled={busy || Date.parse(b.slot.starts_at) <= now} onClick={() => simulate.mutate('approved')}>{copy.approve}</Button><Button variant="outline" disabled={busy} onClick={() => simulate.mutate('rejected')}>{copy.reject}</Button></div><TrainingError error={simulate.error} /></div>}
  </section>
}
