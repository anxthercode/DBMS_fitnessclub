import { StaffShell } from './StaffShell'
import { useSearchParams } from 'react-router'
import { StaffAccount } from './StaffAccount'
import { ReportsPage, ExchangePage } from './ReportsPage'
import { FirstVisitsPage } from './FirstVisitsPage'
import { BookingManager } from './TrainerPage'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { DataTable, Editor, StaffError, StaffGuard, useStaffAction, useStaffRows, useWords, type Field, type Row } from './shared'

export function AdminPage() { return <StaffGuard role="ADMIN"><AdminWorkspace /></StaffGuard> }

function AdminWorkspace() {
  const w = useWords()
  const [params] = useSearchParams()
  const selectedTab = params.get('section') || 'first-visits'
  const groups = [
    { label: w('Посещения', 'Visits'), items: [['first-visits', w('Первые визиты', 'First visits')], ['bookings', w('Заявки тренировок', 'Training requests')], ['passes', w('Пропуска', 'Passes')]] as [string, string][] },
    { label: w('Клуб', 'Club'), items: [['users', w('Пользователи', 'Users')], ['trainers', w('Тренеры', 'Trainers')], ['offers', w('Тарифы', 'Offers')], ['training-offers', w('Цены тренировок', 'Training prices')]] as [string, string][] },
    { label: w('Продажи', 'Sales'), items: [['orders', w('Заказы и платежи', 'Orders and payments')], ['access', w('Выданный доступ', 'Issued access')], ['discounts', w('Скидки', 'Discounts')], ['rates', w('Курсы', 'Rates')]] as [string, string][] },
    { label: w('Данные', 'Data'), items: [['reports', w('Отчёты', 'Reports')], ['exchange', w('Обмен данными', 'Data exchange')]] as [string, string][] },
  ]
  const allowed = [...groups.flatMap(group => group.items.map(([key]) => key)), 'profile', 'notifications']
  const tab = allowed.includes(selectedTab) ? selectedTab : 'first-visits'
  return <StaffShell title={w('Кабинет администратора', 'Administrator workspace')} section={tab} groups={groups}>{['profile', 'notifications'].includes(tab) ? <StaffAccount section={tab} /> : tab === 'reports' ? <ReportsPage /> : tab === 'exchange' ? <ExchangePage /> : tab === 'first-visits' ? <FirstVisitsPage /> : tab === 'bookings' ? <BookingManager /> : <AdminSection key={tab} tab={tab} />}</StaffShell>
}

export function AdminSection({ tab }: { tab: string }) {
  const w = useWords()
  const path = tab === 'users' ? '/users' : '/admin/' + tab
  const query = useStaffRows(path)
  const action = useStaffAction()
  const [edit, setEdit] = useState<Row | null>(null)
  const [selected, setSelected] = useState<Row | null>(null)
  const zones: [string, string][] = [['gym', w('Зал и кардио', 'Gym and cardio')], ['pool', w('Бассейн', 'Pool')], ['both', w('Обе зоны', 'Both zones')]]
  const send = (path: string, body?: unknown, method = 'POST') => action.mutate({ path, body, method }, { onSuccess: () => { setEdit(null); setSelected(null) } })
  const editButton = (r: Row) => <Button variant="outline" disabled={action.isPending} onClick={() => setEdit(r)}>{w('Изменить', 'Edit')}</Button>
  let columns: [string, string][] = [['id', '№']]
  let fields: Field[] = []
  let actions: ((r: Row) => React.ReactNode) | undefined
  let save: (r: Row) => void = () => {}
  if (tab === 'users') {
    columns = [['id', '№'], ['email', 'Email'], ['first_name', w('Имя', 'First name')], ['last_name', w('Фамилия', 'Last name')], ['phone', w('Телефон', 'Phone')], ['role', w('Роль', 'Role')], ['is_active', w('Активен', 'Active')]]
    actions = r => r.role !== 'ADMIN' && <Button variant="outline" disabled={action.isPending} onClick={() => send('/users/' + r.id, { is_active: !r.is_active }, 'PATCH')}>{r.is_active ? w('Деактивировать', 'Deactivate') : w('Активировать', 'Activate')}</Button>
  } else if (tab === 'trainers') {
    columns = [['user_id', '№'], ['name_ru', w('Имя', 'Name')], ['zones', w('Зоны', 'Zones')], ['experience_years', w('Опыт, лет', 'Experience, years')], ['is_active', w('Активен', 'Active')]]
    const profileFields: Field[] = [{ key: 'zones', label: w('Зоны', 'Zones'), options: zones }, { key: 'experience_years', label: w('Опыт, лет', 'Experience, years'), type: 'number', min: 0, max: 80 }, ...(['specialization', 'bio', 'education'] as const).flatMap(key => (['ru', 'en'] as const).map(lang => ({ key: key + '_' + lang, label: (key === 'bio' ? w('Биография', 'Biography') : key === 'education' ? w('Образование', 'Education') : w('Специализация', 'Specialization')) + ' (' + lang.toUpperCase() + ')', type: 'textarea' as const, required: key !== 'education' })))]
    fields = edit?.user_id ? profileFields : [{ key: 'email', label: 'Email', type: 'email' }, { key: 'password', label: w('Начальный пароль (от 8 символов)', 'Initial password (8+ characters)'), type: 'password' }, { key: 'first_name', label: w('Имя', 'First name') }, { key: 'last_name', label: w('Фамилия', 'Last name') }, ...profileFields]
    actions = editButton
    save = r => { const profile = Object.fromEntries(profileFields.map(f => [f.key, f.key === 'experience_years' ? Number(r[f.key]) : r[f.key]])); if (edit?.user_id) send(path + '/' + edit.user_id, profile, 'PUT'); else send(path, { email: r.email, password: r.password, first_name: r.first_name, last_name: r.last_name, locale: 'ru', profile }) }
  } else if (tab === 'offers') {
    columns = [['id', '№'], ['code', w('Код', 'Code')], ['format', w('Формат', 'Format')], ['zones', w('Зоны', 'Zones')], ['months', w('Месяцев', 'Months')], ['price_byn', w('Цена, BYN', 'Price, BYN')], ['is_active', w('Активен', 'Active')]]
    fields = [{ key: 'code', label: w('Код (A–Z, 0–9, _)', 'Code (A–Z, 0–9, _)') }, { key: 'format', label: w('Формат', 'Format'), options: [['membership', w('Абонемент', 'Membership')], ['single_visit', w('Разовый визит', 'Single visit')]] }, { key: 'months', label: w('Срок (для абонемента)', 'Term (membership only)'), options: [['1', '1'], ['3', '3'], ['12', '12']] }, { key: 'zones', label: w('Зоны', 'Zones'), options: zones }, { key: 'name_ru', label: w('Название RU', 'Name RU') }, { key: 'name_en', label: w('Название EN', 'Name EN') }, { key: 'description_ru', label: w('Описание RU', 'Description RU'), type: 'textarea', required: false }, { key: 'description_en', label: w('Описание EN', 'Description EN'), type: 'textarea', required: false }, { key: 'price_byn', label: w('Цена, BYN', 'Price, BYN'), type: 'number', min: .01, step: '.01' }, { key: 'is_active', label: w('Активен', 'Active'), type: 'checkbox' }]
    actions = editButton
    save = r => send(path + (edit?.id ? '/' + edit.id : ''), { ...r, months: r.format === 'membership' ? Number(r.months) : null }, edit?.id ? 'PUT' : 'POST')
  } else if (tab === 'training-offers') {
    columns = [['id', '№'], ['zones', w('Зона', 'Zone')], ['price_byn', w('Цена BYN', 'Price BYN')], ['is_active', w('Активен', 'Active')]]
    fields = [{ key: 'price_byn', label: w('Цена BYN', 'Price BYN'), type: 'number', min: .01, step: '.01' }, { key: 'is_active', label: w('Активен', 'Active'), type: 'checkbox' }]
    actions = editButton; save = r => send(path + '/' + edit?.id, r, 'PUT')
  } else if (tab === 'passes') {
    columns = [['id', '№'], ['email', 'Email'], ['first_name', w('Имя', 'Name')], ['phone', w('Телефон', 'Phone')], ['starts_at', w('Действует с', 'Valid from')], ['ends_at', w('До', 'Until')], ['zones', w('Зоны', 'Zones')], ['redeemed_at', w('Использован', 'Used at')], ['redeemed_by_user_id', w('Сотрудник', 'Staff')]]
    actions = r => !r.redeemed_at && !r.cancelled_at && <Button disabled={action.isPending} onClick={() => send(path + '/' + r.id + '/redeem')}>{w('Погасить при входе', 'Redeem at entry')}</Button>
  } else if (tab === 'orders') {
    columns = [['id', '№'], ['client_id', w('Клиент', 'Client')], ['created_at', w('Создан', 'Created')], ['status', w('Статус', 'Status')], ['total_byn', w('Итого, BYN', 'Total, BYN')], ['total_currency', w('Сумма платежа', 'Payment amount')], ['currency', w('Валюта', 'Currency')]]
    actions = r => <Button variant="outline" onClick={() => setSelected(r)}>{w('Состав и платежи', 'Items and payments')}</Button>
  } else if (tab === 'access') {
    columns = [['id', '№'], ['client_id', w('Клиент', 'Client')], ['format', w('Формат', 'Format')], ['zones', w('Зоны', 'Zones')], ['starts_at', w('Начало', 'Start')], ['ends_at', w('Окончание', 'End')], ['order_id', w('Заказ', 'Order')]]
  } else if (tab === 'discounts') {
    columns = [['code', w('Код', 'Code')], ['kind', w('Тип', 'Type')], ['value', w('Значение', 'Value')], ['is_active', w('Активна', 'Active')]]
    fields = [{ key: 'code', label: w('Код', 'Code') }, { key: 'kind', label: w('Тип', 'Type'), options: [['percent', w('Процент', 'Percent')], ['fixed', w('Сумма BYN', 'Fixed BYN')]] }, { key: 'value', label: w('Значение', 'Value'), type: 'number', min: .01, step: '.01' }, { key: 'is_active', label: w('Активна', 'Active'), type: 'checkbox' }]
    actions = editButton; save = r => send(path, r)
  } else if (tab === 'rates') {
    columns = [['currency', w('Валюта', 'Currency')], ['byn_per_unit', w('BYN за единицу', 'BYN per unit')], ['effective_at', w('Действует с', 'Effective from')]]
    fields = [{ key: 'currency', label: w('Валюта', 'Currency'), options: [['USD', 'USD'], ['EUR', 'EUR']] }, { key: 'byn_per_unit', label: w('BYN за единицу', 'BYN per unit'), type: 'number', min: .00000001, step: '.00000001' }]
    save = r => send(path, r)
  }
  return <><StaffError error={action.error} />{action.isSuccess && <p role="status">{w('Изменения сохранены.', 'Changes saved.')}</p>}{fields.length > 0 && tab !== 'training-offers' && <Button variant="outline" onClick={() => setEdit({ is_active: true, experience_years: 0 })}>{w('Добавить', 'Add')}</Button>}{edit && fields.length > 0 && <><Editor key={JSON.stringify(edit)} fields={fields} initial={edit} submit={save} busy={action.isPending} title={w('Редактирование', 'Edit details')} /><Button variant="ghost" onClick={() => setEdit(null)}>{w('Закрыть форму', 'Close form')}</Button></>}
    {selected && tab === 'orders' && <div className="staff-details"><h3>{w('Заказ', 'Order')} #{String(selected.id)}</h3><DataTable rows={(selected.items as Row[]).map(i => ({ ...i, ...(i.product as Row) }))} columns={[[ 'format', w('Формат', 'Format')], ['zones', w('Зоны', 'Zones')], ['date', w('Дата', 'Date')], ['price_byn', w('Цена BYN', 'Price BYN')]]} /><DataTable rows={selected.attempts as Row[]} columns={[[ 'id', '№'], ['created_at', w('Дата', 'Date')], ['status', w('Статус', 'Status')], ['reason', w('Причина', 'Reason')]]} /></div>}
    {query.isPending ? <Loading /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : <DataTable rows={query.data} columns={columns} actions={actions} />}</>
}
