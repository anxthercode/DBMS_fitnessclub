import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { useSession } from '@/features/auth/session'
import { StaffShell } from './StaffShell'
import { useSearchParams } from 'react-router'
import { StaffAccount } from './StaffAccount'
import { useState } from 'react'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { DataTable, Editor, StaffError, StaffGuard, useStaffAction, useStaffRows, useWords, type Row } from './shared'

export function TrainerPage() { return <StaffGuard role="TRAINER"><TrainerWorkspace /></StaffGuard> }
function TrainerWorkspace() {
  const w = useWords()
  const [params] = useSearchParams()
  const requested = params.get('section') || 'schedule'
  const section = ['schedule', 'bookings', 'profile', 'notifications'].includes(requested) ? requested : 'schedule'
  const groups = [{ label: w('Рабочий день', 'Working day'), items: [['schedule', w('Моё расписание', 'My schedule')], ['bookings', w('Заявки на тренировки', 'Training requests')]] as [string, string][] }]
  return <StaffShell title={w('Кабинет тренера', 'Trainer workspace')} section={section} groups={groups}>{['profile', 'notifications'].includes(section) ? <StaffAccount section={section} /> : section === 'bookings' ? <BookingManager /> : <SlotManager />}</StaffShell>
}
function SlotManager() {
  const w = useWords()
  const slots = useStaffRows('/staff/training-slots')
  const session = useSession()
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const profile = trainers.data?.find(trainer => trainer.user_id === session.data?.id)
  const zoneOptions: [string, string][] = (profile?.zones === 'pool' ? [['pool', w('Бассейн', 'Pool')]] : profile?.zones === 'gym' ? [['gym', w('Зал и кардио', 'Gym and cardio')]] : [['gym', w('Зал и кардио', 'Gym and cardio')], ['pool', w('Бассейн', 'Pool')]])
  const action = useStaffAction()
  const [edit, setEdit] = useState<Row | null>(null)
  const [history, setHistory] = useState(false)
  const save = (r: Row) => {
    const start = new Date(String(r.starts_at) + ':00+03:00')
    if (!Number.isFinite(+start)) return
    const body = { ...r, title_ru: edit?.title_ru || 'Персональная тренировка', title_en: edit?.title_en || 'Personal training', starts_at: start.toISOString(), ends_at: new Date(+start + 3_600_000).toISOString() }
    action.mutate({ path: '/training-slots' + (edit?.id ? '/' + edit.id : ''), method: edit?.id ? 'PUT' : 'POST', body }, { onSuccess: () => setEdit(null) })
  }
  const rows = (slots.data || []).filter(r => history || (r.status === 'scheduled' && Date.parse(String(r.starts_at)) > Date.now()))
  return <>
    <div className="staff-toolbar"><p>{w('Занятия по 60 минут. Время по Минску.', '60-minute sessions. Minsk time.')}</p><Button disabled={!profile || action.isPending} onClick={() => { action.reset(); setEdit({ zone: zoneOptions[0][0] }) }}>{w('Добавить время', 'Add availability')}</Button></div>
    <div className="staff-tabs" role="group" aria-label={w('Период расписания', 'Schedule period')}><button aria-pressed={!history} onClick={() => setHistory(false)}>{w('Предстоящие', 'Upcoming')}</button><button aria-pressed={history} onClick={() => setHistory(true)}>{w('Вся история', 'All history')}</button></div>
    {edit && <><Editor key={JSON.stringify(edit)} initial={edit} title={edit.id ? w('Изменить время', 'Edit availability') : w('Новое время', 'New availability')} fields={[{ key: 'starts_at', label: w('Начало по Минску', 'Start in Minsk time'), type: 'datetime-local' }, { key: 'zone', label: w('Зона', 'Zone'), options: zoneOptions }]} submit={save} busy={action.isPending} /><Button variant="ghost" disabled={action.isPending} onClick={() => setEdit(null)}>{w('Закрыть форму', 'Close form')}</Button></>}
    {trainers.isError && <QueryError retry={() => void trainers.refetch()} />}
    <StaffError error={action.error} />{action.isSuccess && <p role="status">{w('Расписание обновлено.', 'Schedule updated.')}</p>}
    {slots.isPending ? <Loading /> : slots.isError ? <QueryError retry={() => void slots.refetch()} /> : <DataTable rows={rows} columns={[[ 'starts_at', w('Начало', 'Start')], ['zone', w('Зона', 'Zone')], ['status', w('Статус', 'Status')], ['reserved_count', w('Занято', 'Reserved')]]} actions={r => r.status === 'scheduled' && Date.parse(String(r.starts_at)) > Date.now() && <><Button size="sm" variant="outline" disabled={action.isPending || Number(r.reserved_count) > 0} onClick={() => { action.reset(); setEdit({ ...r, starts_at: new Date(Date.parse(String(r.starts_at)) + 10_800_000).toISOString().slice(0, 16) }) }}>{w('Изменить', 'Edit')}</Button><Button size="sm" variant="ghost" disabled={action.isPending} onClick={() => { if (window.confirm(w('Отменить это время? Если клиент записан, его занятие вернётся на баланс.', 'Cancel this time? Any booked session will return to the client’s balance.'))) action.mutate({ path: '/training-slots/' + r.id + '/cancel' }) }}>{w('Отменить слот', 'Cancel slot')}</Button></>} />}
  </>
}

export function BookingManager() {
  const w = useWords()
  const query = useStaffRows('/bookings')
  const action = useStaffAction()
  const [filter, setFilter] = useState('active')
  const rows = (query.data || []).map((r): Row => ({ ...r, ...(r.slot as Row), id: r.id, status: r.status })).filter(r => filter === 'all' || (filter === 'overdue' ? r.requires_attention : ['pending', 'approved'].includes(String(r.status))))
  const decide = (row: Row, status: string) => action.mutate({ path: '/bookings/' + row.id + '/decision', body: { status } })
  return <><h2>{w('Заявки на тренировки', 'Training requests')}</h2><div className="staff-tabs">{[['active', w('Активные', 'Active')], ['overdue', w('Просроченные без решения', 'Overdue pending')], ['all', w('Все', 'All')]].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><StaffError error={action.error} />{query.isPending ? <Loading /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : <DataTable rows={rows} columns={[[ 'id', '№'], ['client_name', w('Клиент', 'Client')], ['trainer_name', w('Тренер', 'Trainer')], ['starts_at', w('Начало', 'Start')], ['status', w('Статус', 'Status')], ['requires_attention', w('Просрочена', 'Overdue')]]} actions={r => <>{r.status === 'pending' && <><Button disabled={action.isPending || Date.parse(String(r.starts_at)) <= Date.now()} onClick={() => decide(r, 'approved')}>{w('Одобрить', 'Approve')}</Button><Button variant="outline" disabled={action.isPending} onClick={() => decide(r, 'rejected')}>{w('Отклонить', 'Reject')}</Button></>}{r.status === 'approved' && Date.parse(String(r.ends_at)) <= Date.now() && <><Button disabled={action.isPending} onClick={() => decide(r, 'attended')}>{w('Посещено', 'Attended')}</Button><Button variant="outline" disabled={action.isPending} onClick={() => decide(r, 'no_show')}>{w('Неявка', 'No-show')}</Button></>}{['pending', 'approved'].includes(String(r.status)) && <Button variant="outline" disabled={action.isPending} onClick={() => decide(r, 'cancelled')}>{w('Отмена клубом', 'Club cancellation')}</Button>}</>} />}</>
}
