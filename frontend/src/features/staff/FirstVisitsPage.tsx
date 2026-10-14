import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react'
import { firstVisitDetail, type VisitHistoryEntry } from '@/api/visits'
import { minskDay } from '@/api/commerce-rules'
import { useSession } from '@/features/auth/session'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { DataTable, StaffError, statusLabel, useStaffAction, useStaffRows, useWords } from './shared'

export function FirstVisitsPage() {
  const w = useWords()
  const rows = useStaffRows('/admin/first-visits')
  const [selected, setSelected] = useState<string | null>(null)
  const opener = useRef('')
  if (selected) return <VisitReview key={selected} id={selected} back={() => {
    setSelected(null)
    requestAnimationFrame(() => document.getElementById(opener.current)?.focus())
  }} />
  return <section className="staff-page"><div><h2>{w('Первые визиты', 'First visits')}</h2><p className="visit-muted">{w('Откройте заявку, проверьте историю и согласуйте дату посещения.', 'Open an application, review the history and agree a visit date.')}</p></div>
    {rows.isPending ? <Loading /> : rows.isError ? <QueryError retry={() => void rows.refetch()} /> : <DataTable rows={rows.data} columns={[
      ['name', w('Посетитель', 'Visitor')], ['phone', w('Телефон', 'Phone')], ['created_at', w('Получена', 'Received')], ['status', w('Статус', 'Status')], ['visit_date', w('Дата визита', 'Visit date')],
    ]} actions={row => <Button id={'visit-review-' + row.id} variant="outline" onClick={() => { opener.current = 'visit-review-' + row.id; setSelected(String(row.id)) }}>{row.status === 'pending' ? w('Рассмотреть', 'Review') : w('Открыть', 'Open')}<ArrowRight size={16} className="ml-2" /></Button>} />}
  </section>
}

function VisitReview({ id, back }: { id: string; back: () => void }) {
  const w = useWords()
  const session = useSession()
  const query = useQuery({ queryKey: ['account', session.data?.id, 'staff', 'first-visit', id], queryFn: () => firstVisitDetail(id), retry: false })
  const action = useStaffAction()
  const heading = useRef<HTMLHeadingElement>(null)
  const [checked, setChecked] = useState(false)
  const [filter, setFilter] = useState<'all' | 'visits'>('all')
  useEffect(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start' }) }, [])
  const decide = (body: unknown) => action.mutate({ path: '/admin/first-visits/' + id + '/decision', body }, { onSuccess: () => { setChecked(false); heading.current?.focus() } })
  const data = query.data
  const evidence = data?.history.filter(row => row.attendance_evidence) || []
  const app = data?.application
  const evidenceTitle = app?.used_at ? w('Вход по этой заявке уже отмечен', 'Entry for this application is already recorded') : evidence.length ? w('Есть отметки посещений', 'Attendance records found') + ': ' + evidence.length : w('Посещения в системе не найдены', 'No attendance records found in the system')
  const evidenceNote = app?.used_at ? w('Дата и время входа сохранены в карточке посетителя выше.', 'The entry date and time are saved in the visitor card above.') : evidence.length ? w('Проверьте, относятся ли записи к этому посетителю, прежде чем подтверждать первый визит.', 'Check whether these records belong to this visitor before confirming a first visit.') : w('Это не подтверждает, что человек пришёл впервые. Решение принимает администратор после проверки.', 'This does not prove that the person is a first-time visitor. An administrator decides after review.')
  return <section className="visit-review">
    <Button variant="ghost" className="visit-back" onClick={back} disabled={action.isPending}><ArrowLeft size={16} className="mr-2" />{w('Все заявки', 'All applications')}</Button>
    <h2 ref={heading} tabIndex={-1} className="visit-heading">{w('Заявка на первый визит', 'First-visit application')} <span>#{id}</span></h2>
    {query.isPending ? <Loading /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : data && app && <>
      <section className="visit-panel" aria-labelledby="visit-person-title">
        <p className="visit-eyebrow">{w('01 · Посетитель', '01 · Visitor')}</p>
        <div className="visit-person-heading"><h3 id="visit-person-title">{app.name}</h3><span className="visit-status">{statusLabel(app.status, w)}</span></div>
        <dl className="visit-facts"><div><dt>{w('Телефон', 'Phone')}</dt><dd><a href={'tel:' + app.phone}>{app.phone}</a></dd></div><div><dt>{w('Заявка получена', 'Received')}</dt><dd>{statusLabel(app.created_at, w)}</dd></div>{app.visit_date && <div><dt>{w('Согласованная дата', 'Agreed date')}</dt><dd>{app.visit_date}</dd></div>}{app.zones && <div><dt>{w('Зоны', 'Zones')}</dt><dd>{statusLabel(app.zones, w)}</dd></div>}{app.used_at && <div><dt>{w('Вход отмечен', 'Entry recorded')}</dt><dd>{statusLabel(app.used_at, w)}</dd></div>}</dl>
      </section>

      <section className="visit-panel" aria-labelledby="visit-history-title">
        <div className="visit-section-heading"><div><p className="visit-eyebrow">{w('02 · Проверка', '02 · Review')}</p><h3 id="visit-history-title">{w('История по телефону', 'History by phone')}</h3></div><Button variant="outline" disabled={query.isFetching || action.isPending} onClick={() => { setChecked(false); void query.refetch() }}>{w('Обновить историю', 'Refresh history')}</Button></div>
        <p className="visit-muted">{w('Совпадение телефона не подтверждает личность. Сверьте имя и уточните у посетителя, был ли он в клубе. Самостоятельные посещения по абонементу могут отсутствовать в истории.', 'A phone match does not establish identity. Check the name and ask whether the person has visited before. Independent membership visits may be missing from the history.')}</p>
        <div className={'visit-evidence' + (evidence.length || app.used_at ? ' has-evidence' : '')}><strong>{evidenceTitle}</strong><p>{evidenceNote}</p></div>
        <details className="visit-accounts"><summary>{w('Аккаунты с этим телефоном', 'Accounts with this phone')} <span>{data.accounts.length}</span><ChevronDown size={16} /></summary>{!data.accounts.length ? <p className="visit-muted">{w('Совпадений нет.', 'No matches.')}</p> : <ul>{data.accounts.map(account => <li key={account.id}><strong>{account.first_name} {account.last_name}</strong><span>{account.email}</span><small>#{account.id} · {statusLabel(account.role, w)} · {account.is_active ? w('Активен', 'Active') : w('Неактивен', 'Inactive')}</small></li>)}</ul>}</details>
        {data.history.length > 0 && <><div className="staff-tabs" role="group" aria-label={w('Фильтр истории', 'History filter')}><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{w('Все записи', 'All records')} ({data.history.length})</button><button aria-pressed={filter === 'visits'} onClick={() => setFilter('visits')}>{w('Отмеченные посещения', 'Recorded attendance')} ({evidence.length})</button></div>
          <div className="visit-history">{(filter === 'visits' ? evidence : data.history).map(row => <HistoryEntry key={row.kind + row.id} row={row} />)}</div></>}
      </section>

      <section className="visit-panel visit-decision" aria-labelledby="visit-decision-title"><p className="visit-eyebrow">{w('03 · Решение', '03 · Decision')}</p><h3 id="visit-decision-title">{w('Решение администратора', 'Administrator decision')}</h3>
        <StaffError error={action.error} />{action.isSuccess && <p role="status" className="visit-saved"><Check size={18} />{w('Решение сохранено.', 'Decision saved.')}</p>}
        {app.status === 'pending' ? <form className="visit-decision-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); decide({ status: 'confirmed', visit_date: form.get('visit_date'), zones: form.get('zones'), eligibility_checked: checked }) }}>
          <p className="visit-muted">{w('Согласуйте дату и зоны с посетителем. Подтверждение сохраняет договорённость; вход отмечается отдельно.', 'Agree the date and zones with the visitor. Confirmation saves the arrangement; entry is recorded separately.')}</p>
          <fieldset disabled={action.isPending}><legend className="sr-only">{w('Условия визита', 'Visit details')}</legend><div className="visit-inputs"><label htmlFor="visit-date">{w('Дата по Минску', 'Minsk date')}<input id="visit-date" name="visit_date" type="date" min={minskDay()} required /></label><label htmlFor="visit-zones">{w('Зоны', 'Zones')}<select id="visit-zones" name="zones" defaultValue="gym"><option value="gym">{w('Зал и кардио', 'Gym and cardio')}</option><option value="pool">{w('Бассейн', 'Pool')}</option><option value="both">{w('Обе зоны', 'Both zones')}</option></select></label></div>
            <label className="visit-checkbox"><input type="checkbox" required checked={checked} onChange={event => setChecked(event.target.checked)} /><span>{w('История проверена: право этого посетителя на первый визит подтверждено', 'History reviewed: this visitor is eligible for a first visit')}</span></label>
          </fieldset><div className="visit-actions"><Button type="submit" disabled={!checked || action.isPending || query.isFetching}>{w('Подтвердить визит', 'Confirm visit')}</Button><Button type="button" variant="outline" disabled={action.isPending} onClick={() => decide({ status: 'rejected' })}>{w('Отклонить заявку', 'Reject application')}</Button><Button type="button" variant="ghost" disabled={action.isPending} onClick={() => decide({ status: 'cancelled' })}>{w('Отменить заявку', 'Cancel application')}</Button></div>
        </form> : app.status === 'confirmed' ? <><p className="visit-muted">{w('Отметьте вход при прибытии посетителя в согласованную дату. Повторный вход не предусмотрен.', 'Record entry when the visitor arrives on the agreed date. Re-entry is not included.')}</p><div className="visit-actions"><Button disabled={action.isPending || app.visit_date !== minskDay()} onClick={() => decide({ status: 'used' })}>{w('Отметить вход', 'Record entry')}</Button><Button variant="outline" disabled={action.isPending} onClick={() => decide({ status: 'cancelled' })}>{w('Отменить визит', 'Cancel visit')}</Button></div></> : <p className="visit-muted">{w('Заявка закрыта. История сохранена.', 'This application is closed. Its history is preserved.')}</p>}
      </section>
    </>}
  </section>
}

function HistoryEntry({ row }: { row: VisitHistoryEntry }) {
  const w = useWords()
  const titles = { first_visit: w('Первый визит', 'First visit'), pass: w('Разовый пропуск', 'Single-visit pass'), membership: w('Абонемент', 'Membership'), training: w('Персональная тренировка', 'Personal training') }
  const statuses: Record<string, string> = { unused: w('Не использован', 'Unused'), expired: w('Истёк', 'Expired'), active: w('Действует', 'Active'), upcoming: w('Начнётся позже', 'Upcoming') }
  return <details className="visit-history-entry"><summary><span><strong>{titles[row.kind]} <small>#{row.id}</small></strong><span className="visit-muted">{row.person_name} · {statusLabel(row.occurred_at || row.starts_at || row.visit_date || row.recorded_at, w)}</span></span><span className="visit-status">{statuses[row.status] || statusLabel(row.status, w)}</span><ChevronDown size={16} /></summary>
    <div className="visit-history-body"><p className={row.attendance_evidence ? 'visit-saved' : 'visit-muted'}>{row.attendance_evidence ? w('Посещение отмечено.', 'Attendance recorded.') : row.kind === 'membership' ? w('Покупка абонемента не подтверждает посещение.', 'Purchasing a membership does not establish attendance.') : row.status === 'no_show' ? w('Неявка: посещение не подтверждено.', 'No-show: attendance is not confirmed.') : w('Отметки о посещении нет.', 'No attendance recorded.')}</p>
      <dl className="visit-facts"><div><dt>{w('Зоны', 'Zones')}</dt><dd>{statusLabel(row.zones, w)}</dd></div><div><dt>{w('Запись создана', 'Record created')}</dt><dd>{statusLabel(row.recorded_at, w)}</dd></div>{row.client_id && <div><dt>{w('Аккаунт', 'Account')}</dt><dd>#{row.client_id}</dd></div>}{row.order_id && <div><dt>{w('Заказ', 'Order')}</dt><dd>#{row.order_id}</dd></div>}{row.ends_at && <div><dt>{w('Окончание', 'Ends')}</dt><dd>{statusLabel(row.ends_at, w)}</dd></div>}{row.trainer_name && <div><dt>{w('Тренер', 'Trainer')}</dt><dd>{row.trainer_name}</dd></div>}{row.actor_name && <div><dt>{w('Отметил сотрудник', 'Recorded by')}</dt><dd>{row.actor_name}</dd></div>}{row.decided_at && <div><dt>{w('Решение сохранено', 'Decision saved')}</dt><dd>{statusLabel(row.decided_at, w)}</dd></div>}</dl>
    </div></details>
}
