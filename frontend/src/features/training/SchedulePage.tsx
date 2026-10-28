import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import './schedule.css'
import { nearestDay, shiftDay, validDay, weekStart } from './schedule-days'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { api } from '@/api'
import { date, localized, localDay } from '@/lib/format'
import { useSession } from '@/features/auth/session'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { useTrainingCopy } from './copy'
import { useClock, usePrivateQuery, useTrainingAction } from './hooks'
import { SlotSummary, TrainingError } from './shared'

export function SchedulePage() {
  const { copy, locale } = useTrainingCopy()
  const w = (ru: string, en: string) => locale === 'ru' ? ru : en
  const [params, setParams] = useSearchParams()
  const now = useClock()
  const today = localDay(new Date(now).toISOString())
  const slots = useQuery({ queryKey: ['schedule'], queryFn: api.slots, refetchInterval: 30_000 })
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const filtered = (slots.data || []).filter(s => s.status === 'scheduled' && Date.parse(s.starts_at) > now && (!params.get('trainer') || s.trainer_id === params.get('trainer')) && (!params.get('zone') || s.zone === params.get('zone'))).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const requested = params.get('date')
  const day = validDay(requested) && requested >= today ? requested : nearestDay(filtered, today)
  const first = weekStart(day)
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(first, i))
  const lastDay = filtered.length ? localDay(filtered[filtered.length - 1].starts_at) : today
  const visible = filtered.filter(s => localDay(s.starts_at) === day)
  const groups = [...new Set(visible.map(s => s.trainer_id))]
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'date') next.delete('date')
    setParams(next, { replace: true })
  }
  const dayLabel = (value: string, options: Intl.DateTimeFormatOptions) => date(value + 'T12:00:00Z', locale, options)
  return <section className="container-shell page-section training-page schedule-page">
    <div className="page-intro"><h1 className="page-title">{copy.schedule}</h1><div><p>{w('Выберите день и удобное время. Одно занятие — 60 минут с тренером, который работает с вашей целью.', 'Choose a day and time. One session is 60 minutes with a trainer focused on your goals.')}</p><Link className="training-link" to="/training">{w('Мои занятия', 'My sessions')} ↗</Link></div></div>
    <div className="schedule-toolbar">
      <div className="schedule-zones" role="group" aria-label={copy.zone}>{[['', w('Все зоны', 'All zones')], ['gym', copy.gym], ['pool', copy.pool]].map(([key, name]) => <button key={key} aria-pressed={(params.get('zone') || '') === key} onClick={() => update('zone', key)}>{name}</button>)}</div>
      <label className="schedule-coach-filter">{copy.trainer}<select value={params.get('trainer') || ''} onChange={e => update('trainer', e.target.value)}><option value="">{w('Любой тренер', 'Any trainer')}</option>{trainers.data?.map(t => <option key={t.user_id} value={t.user_id}>{localized(t, 'name', locale)}</option>)}</select></label>
    </div>
    <div className="schedule-calendar">
      <div className="schedule-week-heading"><h2>{dayLabel(day, { month: 'long', year: 'numeric' })}</h2><div><Button size="icon" variant="outline" aria-label={w('Предыдущая неделя', 'Previous week')} disabled={first <= weekStart(today)} onClick={() => update('date', shiftDay(first, -7) < today ? today : shiftDay(first, -7))}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label={w('Следующая неделя', 'Next week')} disabled={shiftDay(first, 7) > lastDay} onClick={() => update('date', shiftDay(first, 7))}><ChevronRight /></Button></div></div>
      <div className="schedule-days" role="group" aria-label={w('День тренировки', 'Training day')}>{days.map(value => {
        const count = filtered.filter(s => localDay(s.starts_at) === value && s.reserved_count < s.capacity).length
        return <button key={value} disabled={value < today} aria-pressed={value === day} aria-label={dayLabel(value, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + w('свободно: ', 'available: ') + count} onClick={() => update('date', value)}><span>{dayLabel(value, { weekday: 'short' })}</span><strong>{Number(value.slice(-2))}</strong><i className={count ? 'has-times' : ''} aria-hidden="true" /></button>
      })}</div>
    </div>
    {trainers.isError && <QueryError retry={() => void trainers.refetch()} />}
    <div className="schedule-day-heading"><h2>{dayLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><span>{w('60 минут · время по Минску', '60 minutes · Minsk time')}</span></div>
    {slots.isPending ? <Loading /> : slots.isError ? <QueryError retry={() => void slots.refetch()} /> : !visible.length ? <div className="schedule-empty"><h3>{w('На этот день нет занятий', 'No sessions on this day')}</h3><p>{w('Выберите день с отметкой в календаре или другого тренера.', 'Choose a marked day in the calendar or another trainer.')}</p><Button variant="outline" onClick={() => setParams({})}>{copy.reset}</Button></div> : <div className="schedule-coaches">{groups.map(id => {
      const coach = trainers.data?.find(t => t.user_id === id)
      const times = visible.filter(s => s.trainer_id === id)
      const portrait = coach?.portrait_key && ['trainer-01', 'trainer-02', 'trainer-03'].includes(coach.portrait_key) ? coach.portrait_key : null
      return <article className="schedule-coach" key={id}><div className="schedule-coach-person"><div className="schedule-avatar">{portrait ? <img src={'/images/trainers/' + portrait + '.webp'} alt="" /> : <UserRound aria-hidden="true" />}</div><div><h3>{coach ? localized(coach, 'name', locale) : times[0].trainer_name}</h3><p>{coach ? localized(coach, 'specialization', locale) : copy.trainer}</p></div></div><div className="schedule-times">{times.map(slot => {
        const full = slot.reserved_count >= slot.capacity
        return <Link key={slot.id} className={'schedule-time' + (full ? ' is-full' : '')} to={'/schedule/' + slot.id} aria-label={dayLabel(localDay(slot.starts_at), { day: 'numeric', month: 'long' }) + ' · ' + date(slot.starts_at, locale, { hour: '2-digit', minute: '2-digit' }) + ' · ' + copy[slot.zone] + (full ? ' · ' + copy.full : '')}><strong>{date(slot.starts_at, locale, { hour: '2-digit', minute: '2-digit' })}</strong><span>{full ? copy.full : copy[slot.zone]}</span></Link>
      })}</div></article>
    })}</div>}
  </section>
}
export function SlotPage() {
  const { id = '' } = useParams()
  const { copy, locale } = useTrainingCopy()
  const now = useClock()
  const session = useSession()
  const navigate = useNavigate()
  const slots = useQuery({ queryKey: ['schedule'], queryFn: api.slots, refetchInterval: 30_000 })
  const check = usePrivateQuery(['eligibility', id], () => api.eligibility(id))
  const book = useTrainingAction(() => api.book({ training_slot_id: id }), result => navigate('/account/bookings/' + result.id))
  if (slots.isPending || session.isPending) return <Loading />
  if (slots.isError || session.isError) return <QueryError retry={() => { void slots.refetch(); void session.refetch() }} />
  const slot = slots.data.find(s => s.id === id)
  if (!slot) return <section className="container-shell page-section"><TrainingError error="not_found" /></section>
  const unavailable = slot.status !== 'scheduled' || Date.parse(slot.starts_at) <= now
  return <section className="container-shell page-section training-page"><Link className="training-link" to="/schedule">← {copy.schedule}</Link><h1 className="page-title">{copy.slot}</h1>
    <div className="commerce-grid mt-8"><article className="commerce-card"><SlotSummary slot={slot} /><p>{copy.available}: {Math.max(0, slot.capacity - slot.reserved_count)} / {slot.capacity}</p><p>{copy.cancelRule}</p><p>{copy.date}: {date(slot.starts_at, locale, { weekday: 'long' })} · Europe/Minsk</p></article>
      <aside className="commerce-card"><h2>{copy.access}</h2>
        {unavailable ? <TrainingError error="slot_unavailable" /> : !session.data ? <><p>{copy.signInNote}</p><Button asChild><Link to={'/login?redirect=' + encodeURIComponent('/schedule/' + id)}>{copy.signIn}</Link></Button></> : session.data.role !== 'CLIENT' ? <TrainingError error="forbidden" /> : check.isPending ? <Loading /> : check.isError ? <QueryError retry={() => void check.refetch()} /> : <>
          {check.data.eligible ? <p>{copy.eligible}</p> : ['membership_required', 'zone_required'].includes(check.data.code || '') ? <p className="commerce-error" role="alert">{locale === 'ru' ? 'Для этой записи нужен абонемент' : 'This booking requires a membership'} · {copy[slot.zone]} · {date(slot.starts_at, locale, { day: 'numeric', month: 'long', year: 'numeric' })}. {locale === 'ru' ? 'Он должен покрывать всё занятие.' : 'It must cover the entire session.'}</p> : <TrainingError error={check.data.code} />}
          {['membership_required', 'zone_required', 'training_credit_required'].includes(check.data.code || '') && <Link className="training-link" to={check.data.code === 'training_credit_required' ? '/training' : '/plans?' + new URLSearchParams({ format: 'membership', zones: slot.zone, date: localDay(slot.starts_at), months: '1' })}>{check.data.code === 'training_credit_required' ? (locale === 'ru' ? 'Купить тренировку' : 'Buy a session') : copy.choose} ↗</Link>}
          {check.data.code === 'booking_overlap' && <Link className="training-link" to="/account/bookings">{copy.bookings} ↗</Link>}
          <Button className="mt-5" disabled={!check.data.eligible || book.isPending || check.isFetching} onClick={() => book.mutate()}>{book.isPending ? copy.busy : copy.request}</Button><TrainingError error={book.error} />
          {book.isError && <Button variant="outline" onClick={() => { void check.refetch(); void slots.refetch() }}>{copy.access}</Button>}
        </>}
      </aside>
    </div>
  </section>
}
