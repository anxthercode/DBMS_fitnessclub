import { useState } from 'react'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { DataTable, Editor, StaffError, StaffGuard, useStaffAction, useStaffRows, useWords, type Row } from './shared'

export function TrainerPage() { return <StaffGuard role="TRAINER"><TrainerWorkspace /></StaffGuard> }
function TrainerWorkspace() {
  const w = useWords()
  return <section className="container-shell page-section staff-page"><h1 className="page-title">{w('Кабинет тренера', 'Trainer workspace')}</h1><SlotManager /><BookingManager /></section>
}
function SlotManager() {
  const w = useWords()
  const slots = useStaffRows('/staff/training-slots')
  const action = useStaffAction()
  const [edit, setEdit] = useState<Row>({ zone: 'gym', title_ru: 'Персональная тренировка', title_en: 'Personal training' })
  const save = (r: Row) => {
    const start = new Date(String(r.starts_at) + ':00+03:00')
    const body = { ...r, starts_at: start.toISOString(), ends_at: new Date(+start + 3_600_000).toISOString() }
    action.mutate({ path: '/training-slots' + (edit.id ? '/' + edit.id : ''), method: edit.id ? 'PUT' : 'POST', body })
  }
  return <><h2>{w('Моё расписание', 'My schedule')}</h2><p>{w('Время по Минску. Каждый слот длится 60 минут. Занятые слоты можно отменить; их изменение запрещено.', 'Minsk time. Each slot lasts 60 minutes. Booked slots can be cancelled; editing them is blocked.')}</p><Editor key={JSON.stringify(edit)} initial={edit} title={edit.id ? w('Изменить слот', 'Edit slot') : w('Создать слот', 'Create slot')} fields={[{ key: 'starts_at', label: w('Начало по Минску', 'Start in Minsk time'), type: 'datetime-local' }, { key: 'zone', label: w('Зона', 'Zone'), options: [['gym', w('Зал и кардио', 'Gym and cardio')], ['pool', w('Бассейн', 'Pool')]] }, { key: 'title_ru', label: w('Название RU', 'Title RU') }, { key: 'title_en', label: w('Название EN', 'Title EN') }]} submit={save} busy={action.isPending} /><Button variant="outline" onClick={() => setEdit({ zone: 'gym', title_ru: 'Персональная тренировка', title_en: 'Personal training' })}>{w('Новый слот', 'New slot')}</Button><StaffError error={action.error} />{action.isSuccess && <p role="status">{w('Расписание обновлено.', 'Schedule updated.')}</p>}{slots.isPending ? <Loading /> : slots.isError ? <QueryError retry={() => void slots.refetch()} /> : <DataTable rows={slots.data} columns={[[ 'id', '№'], ['starts_at', w('Начало', 'Start')], ['ends_at', w('Окончание', 'End')], ['zone', w('Зона', 'Zone')], ['status', w('Статус', 'Status')], ['reserved_count', w('Занято', 'Reserved')]]} actions={r => r.status === 'scheduled' && <><Button variant="outline" disabled={action.isPending || Number(r.reserved_count) > 0} onClick={() => setEdit({ ...r, starts_at: new Date(Date.parse(String(r.starts_at)) + 10_800_000).toISOString().slice(0, 16) })}>{w('Изменить', 'Edit')}</Button><Button variant="outline" disabled={action.isPending} onClick={() => action.mutate({ path: '/training-slots/' + r.id + '/cancel' })}>{w('Отменить слот', 'Cancel slot')}</Button></>} />}</>
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
