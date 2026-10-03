import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { Link } from 'react-router'
import { ApiError, type Booking, type Slot } from '@/api/types'
import { date, localized, time } from '@/lib/format'
import { useTrainingCopy } from './copy'
import './training.css'

export function TrainingError({ error }: { error: Error | string | null }) {
  const { copy } = useTrainingCopy()
  if (!error) return null
  const code = typeof error === 'string' ? error : error instanceof ApiError ? error.code : 'unknown'
  return <p className="commerce-error" role="alert">{copy.errors[code as keyof typeof copy.errors] || copy.errors.unknown}</p>
}
export function SlotSummary({ slot }: { slot: Slot }) {
  const { copy, locale } = useTrainingCopy()
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const trainer = trainers.data?.find(t => t.user_id === slot.trainer_id)
  const name = trainer ? localized(trainer, 'name', locale) : slot.trainer_name
  return <div className="slot-summary"><h2>{localized(slot, 'title', locale)}</h2><p><time dateTime={slot.starts_at}>{date(slot.starts_at, locale, { day: 'numeric', month: 'long', year: 'numeric' })} · {time(slot.starts_at, locale)}–{time(slot.ends_at, locale)}</time></p><p>{name}</p><div className="zone-badges"><span>{copy[slot.zone]}</span><span>{copy[slot.training_type]}</span></div></div>
}
export function BookingCard({ booking }: { booking: Booking }) {
  const { copy } = useTrainingCopy()
  return <article className="commerce-card booking-card"><span className="status-badge">{copy[booking.status]}</span><SlotSummary slot={booking.slot} /><Link className="training-link" to={'/account/bookings/' + booking.id}>{copy.booking} #{booking.id} ↗</Link></article>
}
