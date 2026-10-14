import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router'
import { ApiError } from '@/api/types'
import { isMock } from '@/api'
import { request } from '@/api/http'
import { useSession } from '@/features/auth/session'
import { useTrainingAction } from '@/features/training/hooks'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import './staff.css'

export type Row = Record<string, unknown>
export function useWords() {
  const { i18n } = useTranslation()
  return (ru: string, en: string) => i18n.language.startsWith('ru') ? ru : en
}
export function StaffGuard({ role, children }: { role: 'ADMIN' | 'TRAINER'; children: ReactNode }) {
  const session = useSession()
  const w = useWords()
  if (session.isPending) return <Loading />
  if (session.isError) return <QueryError retry={() => void session.refetch()} />
  if (!session.data) return <Navigate to={'/login?redirect=/' + role.toLowerCase()} replace />
  if (session.data.role !== role) return <p role="alert">{w('Доступ запрещён.', 'Access denied.')}</p>
  if (isMock) return <p>{w('Кабинеты сотрудников доступны при подключении к серверу.', 'Staff workspaces require a server connection.')}</p>
  return children
}
export function useStaffRows(path: string) {
  const session = useSession()
  return useQuery({ queryKey: ['account', session.data?.id, 'staff', path], queryFn: () => request<Row[]>(path), enabled: !!session.data && !isMock, retry: false, refetchInterval: 30_000 })
}
export function useStaffAction() {
  const client = useQueryClient()
  return useTrainingAction(({ path, method = 'POST', body }: { path: string; method?: string; body?: unknown }) => request(path, method, body), () => {
    void client.invalidateQueries({ queryKey: ['trainers'] })
    void client.invalidateQueries({ queryKey: ['offers'] })
  })
}
export function StaffError({ error }: { error: Error | null }) {
  const w = useWords()
  if (!error) return null
  const code = error instanceof ApiError ? error.code : 'unknown'
  const messages: Record<string, [string, string]> = {
    invalid_import: ['Файл не соответствует схеме обмена. Скачайте образец и проверьте поля.', 'The file does not match the exchange schema. Export a sample and check the fields.'],
    invalid_request: ['Проверьте поля формы.', 'Check the form fields.'],
    visit_already_requested: ['Заявка уже существует или первый визит использован.', 'An application exists or the first visit was already used.'],
    visit_changed: ['Состояние заявки уже изменилось.', 'The application status has changed.'],
    invalid_date: ['Действие недоступно на выбранную дату.', 'This action is unavailable on the selected date.'],
    pass_used: ['Пропуск уже использован или отменён.', 'The pass was already used or cancelled.'],
    club_closed: ['Вход доступен с 07:00 до 23:00 по Минску.', 'Entry is available 07:00–23:00 Minsk time.'],
    offer_conflict: ['Тариф с таким кодом или сочетанием условий уже существует.', 'An offer with this code or combination already exists.'],
    email_exists: ['Этот email уже используется.', 'This email is already in use.'],
    forbidden: ['Недостаточно прав.', 'Access denied.'],
    slot_overlap: ['Время пересекается с другим слотом тренера.', 'This overlaps another trainer slot.'],
    slot_unavailable: ['Слот уже начался, отменён или завершён.', 'The slot has started, was cancelled or completed.'],
    booking_changed: ['Недопустимый переход статуса заявки.', 'Invalid booking status transition.'],
    slot_has_bookings: ['Сначала отмените занятый слот и создайте новый.', 'Cancel the booked slot before creating another.'],
    trainer_zone_conflict: ['Зона не соответствует специализации или будущим слотам.', 'The zone conflicts with specialization or future slots.'],
  }
  const text = messages[code]
  return <p role="alert" className="text-destructive">{text ? w(...text) : w('Не удалось выполнить действие. Обновите данные и попробуйте снова.', 'Action failed. Refresh and try again.')}</p>
}
export function statusLabel(value: unknown, w: ReturnType<typeof useWords>) {
  const labels: Record<string, [string, string]> = {
    available: ['Доступно', 'Available'], reserved: ['Зарезервировано', 'Reserved'], scheduled: ['Запланирован', 'Scheduled'], completed: ['Завершён', 'Completed'], pending: ['Ожидает', 'Pending'], confirmed: ['Подтверждён', 'Confirmed'], rejected: ['Отклонён', 'Rejected'], cancelled: ['Отменён', 'Cancelled'], used: ['Использован', 'Used'],
    approved: ['Одобрен', 'Approved'], attended: ['Посещено', 'Attended'], no_show: ['Неявка', 'No-show'], paid: ['Оплачен', 'Paid'], succeeded: ['Успех', 'Succeeded'], failed: ['Отказ', 'Failed'],
    gym: ['Зал и кардио', 'Gym and cardio'], gym_cardio: ['Зал и кардио', 'Gym and cardio'], pool: ['Бассейн', 'Pool'], both: ['Обе зоны', 'Both zones'], 'gym_cardio,pool': ['Обе зоны', 'Both zones'],
    CLIENT: ['Клиент', 'Client'], TRAINER: ['Тренер', 'Trainer'], ADMIN: ['Администратор', 'Administrator'], membership: ['Абонемент', 'Membership'], single_visit: ['Разовый визит', 'Single visit'], training: ['Тренировка', 'Training'],
  }
  if (typeof value === 'boolean') return value ? w('Да', 'Yes') : w('Нет', 'No')
  if (value === null || value === undefined || value === '') return '—'
  const text = String(value)
  if (labels[text]) return w(...labels[text])
  if (/^\d{4}-\d\d-\d\dT/.test(text)) return new Date(text).toLocaleString(w('ru', 'en'), { timeZone: 'Europe/Minsk' })
  return text
}
export type Field = { key: string; label: string; type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'datetime-local' | 'checkbox' | 'textarea'; options?: [string, string][]; required?: boolean; min?: number; max?: number; step?: string }
export function Editor({ fields, initial = {}, submit, busy, title }: { fields: Field[]; initial?: Row; submit: (row: Row) => void; busy?: boolean; title: string }) {
  const w = useWords()
  return <form className="staff-form" onSubmit={event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const row: Row = {}
    fields.forEach(field => { row[field.key] = field.type === 'checkbox' ? form.has(field.key) : form.get(field.key) })
    submit(row)
  }}><h3>{title}</h3>{fields.map(field => <label key={field.key}>{field.label}{field.options ? <select name={field.key} defaultValue={String(initial[field.key] ?? field.options[0][0])}>{field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> : field.type === 'textarea' ? <textarea name={field.key} defaultValue={String(initial[field.key] ?? '')} required={field.required ?? true} maxLength={3000} /> : <input name={field.key} type={field.type || 'text'} defaultValue={field.type === 'checkbox' ? undefined : String(initial[field.key] ?? '')} defaultChecked={field.type === 'checkbox' ? Boolean(initial[field.key]) : undefined} required={field.type === 'checkbox' ? false : (field.required ?? true)} min={field.min} max={field.max} step={field.step} maxLength={field.type === 'password' ? 128 : 200} autoComplete={field.type === 'password' ? 'new-password' : undefined} />}</label>)}<Button type="submit" disabled={busy}>{w('Сохранить', 'Save')}</Button></form>
}
export function DataTable({ rows, columns, actions }: { rows: Row[]; columns: [string, string][]; actions?: (row: Row) => ReactNode }) {
  const w = useWords()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('id')
  const [desc, setDesc] = useState(false)
  const visible = rows.filter(row => columns.some(([key]) => String(row[key] ?? '').toLowerCase().includes(search.toLowerCase()))).sort((a, b) => String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''), undefined, { numeric: true }) * (desc ? -1 : 1))
  return <><label className="staff-search">{w('Поиск', 'Search')}<input value={search} onChange={e => setSearch(e.target.value)} /></label><div className="staff-table-scroll" tabIndex={0}><table className="staff-table"><thead><tr>{columns.map(([key, label]) => <th key={key}><button onClick={() => { setSort(key); setDesc(sort === key ? !desc : false) }}>{label}{sort === key ? desc ? ' ↓' : ' ↑' : ''}</button></th>)}{actions && <th>{w('Действия', 'Actions')}</th>}</tr></thead><tbody>{visible.map((row, i) => <tr key={String(row.id ?? row.user_id ?? i)}>{columns.map(([key]) => <td key={key}>{statusLabel(row[key], w)}</td>)}{actions && <td>{actions(row)}</td>}</tr>)}</tbody></table></div>{!visible.length && <p>{w('Записей нет.', 'No records.')}</p>}</>
}
