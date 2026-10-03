import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { api, isMock } from '@/api'
import { date, localized, localDay } from '@/lib/format'
import { useSession } from '@/features/auth/session'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { useTrainingCopy } from './copy'
import { useClock, usePrivateQuery, useTrainingAction } from './hooks'
import { SlotSummary, TrainingError } from './shared'

export function SchedulePage() {
  const { copy, locale } = useTrainingCopy()
  const [params, setParams] = useSearchParams()
  const now = useClock()
  const slots = useQuery({ queryKey: ['schedule'], queryFn: api.slots, refetchInterval: 30_000 })
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }
  const visible = slots.data?.filter(s => s.status === 'scheduled' && Date.parse(s.starts_at) > now && (!params.get('date') || localDay(s.starts_at) === params.get('date')) && (!params.get('trainer') || s.trainer_id === params.get('trainer')) && (!params.get('format') || s.training_type === params.get('format')) && (!params.get('zone') || s.zone === params.get('zone'))).sort((a, b) => a.starts_at.localeCompare(b.starts_at)) || []
  return <section className="container-shell page-section training-page"><h1 className="page-title">{copy.schedule}</h1><p className="commerce-intro">{copy.intro}</p>
    <div className="schedule-filters"><label>{copy.date}<input type="date" value={params.get('date') || ''} onChange={e => update('date', e.target.value)} /></label>
      <label>{copy.trainer}<select value={params.get('trainer') || ''} onChange={e => update('trainer', e.target.value)}><option value="">{copy.all}</option>{trainers.data?.map(t => <option key={t.user_id} value={t.user_id}>{localized(t, 'name', locale)}</option>)}</select></label>
      <label>{copy.format}<select value={params.get('format') || ''} onChange={e => update('format', e.target.value)}><option value="">{copy.all}</option><option value="group">{copy.group}</option><option value="individual">{copy.individual}</option></select></label>
      <label>{copy.zone}<select value={params.get('zone') || ''} onChange={e => update('zone', e.target.value)}><option value="">{copy.all}</option><option value="gym">{copy.gym}</option><option value="pool">{copy.pool}</option></select></label>
      <Button variant="outline" onClick={() => setParams({})}>{copy.reset}</Button>
    </div>
    {trainers.isError && <QueryError retry={() => void trainers.refetch()} />}
    {slots.isPending ? <Loading /> : slots.isError ? <QueryError retry={() => void slots.refetch()} /> : !visible.length ? <p className="commerce-empty">{copy.noSlots}</p> : <div className="schedule-list">{visible.map(slot => <article className="commerce-card" key={slot.id}><SlotSummary slot={slot} /><p>{slot.reserved_count >= slot.capacity ? copy.full : copy.available + ': ' + (slot.capacity - slot.reserved_count) + ' / ' + slot.capacity}</p><Link className="training-link" to={'/schedule/' + slot.id}>{copy.details} ↗</Link></article>)}</div>}
  </section>
}
export function SlotPage() {
  const { id = '' } = useParams()
  const { copy, locale } = useTrainingCopy()
  const now = useClock()
  const session = useSession()
  const navigate = useNavigate()
  const client = useQueryClient()
  const slots = useQuery({ queryKey: ['schedule'], queryFn: api.slots, refetchInterval: 30_000 })
  const check = usePrivateQuery(['eligibility', id], () => api.eligibility(id))
  const book = useTrainingAction(() => api.book({ training_slot_id: id }), result => navigate('/account/bookings/' + result.id))
  const verify = useTrainingAction(() => api.verifyDemoEmail(), user => { client.setQueryData(['session'], user) })
  if (slots.isPending || session.isPending) return <Loading />
  if (slots.isError || session.isError) return <QueryError retry={() => { void slots.refetch(); void session.refetch() }} />
  const slot = slots.data.find(s => s.id === id)
  if (!slot) return <section className="container-shell page-section"><TrainingError error="not_found" /></section>
  const unavailable = slot.status !== 'scheduled' || Date.parse(slot.starts_at) <= now
  return <section className="container-shell page-section training-page"><Link className="training-link" to="/schedule">← {copy.schedule}</Link><h1 className="page-title">{copy.slot}</h1>
    <div className="commerce-grid mt-8"><article className="commerce-card"><SlotSummary slot={slot} /><p>{copy.available}: {Math.max(0, slot.capacity - slot.reserved_count)} / {slot.capacity}</p><p>{copy.cancelRule}</p><p>{copy.date}: {date(slot.starts_at, locale, { weekday: 'long' })} · Europe/Minsk</p></article>
      <aside className="commerce-card"><h2>{copy.access}</h2>
        {unavailable ? <TrainingError error="slot_unavailable" /> : !session.data ? <><p>{copy.signInNote}</p><Button asChild><Link to={'/login?redirect=' + encodeURIComponent('/schedule/' + id)}>{copy.signIn}</Link></Button></> : session.data.role !== 'CLIENT' ? <TrainingError error="forbidden" /> : check.isPending ? <Loading /> : check.isError ? <QueryError retry={() => void check.refetch()} /> : <>
          {check.data.eligible ? <p>{copy.eligible}</p> : <TrainingError error={check.data.code} />}
          {check.data.code === 'verify_email' && isMock && <><p>{copy.verifyNote}</p><Button variant="outline" disabled={verify.isPending} onClick={() => verify.mutate()}>{copy.verify}</Button><TrainingError error={verify.error} /></>}
          {['membership_required', 'zone_required', 'training_permission'].includes(check.data.code || '') && <Link className="training-link" to="/plans">{copy.choose} ↗</Link>}
          {check.data.code === 'booking_overlap' && <Link className="training-link" to="/account/bookings">{copy.bookings} ↗</Link>}
          <Button className="mt-5" disabled={!check.data.eligible || book.isPending || check.isFetching} onClick={() => book.mutate()}>{book.isPending ? copy.busy : copy.request}</Button><TrainingError error={book.error} />
          {book.isError && <Button variant="outline" onClick={() => { void check.refetch(); void slots.refetch() }}>{copy.access}</Button>}
        </>}
      </aside>
    </div>
  </section>
}
