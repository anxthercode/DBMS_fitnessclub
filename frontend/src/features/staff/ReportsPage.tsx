import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { request, download } from '@/api/http'
import { minskDay } from '@/api/commerce-rules'
import { useSession } from '@/features/auth/session'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { DataTable, StaffError, useWords, type Row } from './shared'

interface Report { as_of: string; totals: { total_byn: string }; order_count: number; summaries: Record<'sales' | 'attendance' | 'popularity' | 'occupancy', Row[]> }
export function ReportsPage() {
  const w = useWords()
  const session = useSession()
  const today = minskDay()
  const [range, setRange] = useState({ start: today.slice(0, 8) + '01', end: today })
  const params = new URLSearchParams(range).toString()
  const query = useQuery({ queryKey: ['account', session.data?.id, 'staff', 'reports', params], queryFn: () => request<Report>('/admin/reports?' + params), retry: false })
  const exporting = useMutation({ mutationFn: (format: string) => download('/admin/reports/sales.' + format + '?' + params + '&locale=' + w('ru', 'en') + '&as_of=' + encodeURIComponent(query.data!.as_of), 'northside-sales.' + format) })
  const tables: [keyof Report['summaries'], string, [string, string][]][] = [
    ['sales', w('Продажи', 'Sales'), [['day', w('Дата оплаты', 'Payment date')], ['orders', w('Заказов', 'Orders')], ['revenue_byn', w('Выручка BYN', 'Revenue BYN')]]],
    ['attendance', w('Посещения тренировок', 'Training attendance'), [['trainer_name', w('Тренер', 'Trainer')], ['attended', w('Посещено', 'Attended')], ['no_show', w('Неявок', 'No-shows')]]],
    ['popularity', w('Популярность тарифов доступа', 'Access offer popularity'), [['code', w('Код тарифа', 'Offer code')], ['access_kind', w('Формат', 'Format')], ['duration_months', w('Месяцев', 'Months')], ['purchased_count', w('Куплено', 'Purchased')]]],
    ['occupancy', w('Занятость тренеров', 'Trainer occupancy'), [['trainer_name', w('Тренер', 'Trainer')], ['scheduled_minutes', w('Всего минут в расписании', 'Scheduled minutes')], ['booked_minutes', w('Забронировано минут', 'Booked minutes')]]],
  ]
  return <><h2>{w('Продажи и посещаемость', 'Sales and attendance')}</h2><form className="staff-form" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); setRange({ start: String(form.get('start')), end: String(form.get('end')) }) }}><label>{w('С даты', 'From')}<input name="start" type="date" defaultValue={range.start} required /></label><label>{w('По дату включительно', 'Through date')}<input name="end" type="date" defaultValue={range.end} required /></label><Button type="submit">{w('Показать', 'Show')}</Button></form><p>{w('Все даты по Минску. Продажи учитываются по успешной оплате, после скидок, в BYN. Посещаемость относится к тренировкам. Занятость включает ожидающие, одобренные и состоявшиеся записи; отменённые слоты исключены.', 'All dates use Minsk time. Sales use successful payment dates and BYN totals after discounts. Attendance covers training sessions. Occupancy includes pending, approved and completed bookings; cancelled slots are excluded.')}</p>
    {query.isPending ? <Loading /> : query.isError ? <QueryError retry={() => void query.refetch()} /> : <><p>{w('Оплаченных заказов', 'Paid orders')}: {query.data.order_count} · {w('Итого', 'Total')}: {query.data.totals.total_byn} BYN</p><div className="staff-tabs">{['docx', 'xlsx', 'pdf'].map(format => <Button key={format} disabled={exporting.isPending} onClick={() => exporting.mutate(format)}>{w('Скачать', 'Download')} {format.toUpperCase()}</Button>)}</div>{tables.map(([key, title, columns]) => <section className="staff-page" key={key}><h3>{title}</h3><DataTable rows={query.data.summaries[key]} columns={columns} /></section>)}</>}<StaffError error={exporting.error} /></>
}

interface Preview { applied: boolean; created: number; updated: number; offers: Row[] }
export function ExchangePage() {
  const w = useWords()
  const [format, setFormat] = useState('json')
  const [content, setContent] = useState('')
  const [fileError, setFileError] = useState('')
  const preview = useMutation({ mutationFn: (apply: boolean) => request<Preview>('/admin/exchange/offers', 'POST', { format, content, apply }) })
  const exporting = useMutation({ mutationFn: () => download('/admin/exchange/offers?format=' + format, 'northside-offers.' + format) })
  return <><h2>{w('Обмен тарифами доступа', 'Access offer exchange')}</h2><p>{w('Сначала выгрузите образец. Импорт добавляет или обновляет тариф по коду; оплаченные заказы не меняются. Весь файл проверяется до записи. Не более 100 тарифов и 1 МБ.', 'Export a sample first. Import adds or updates offers by code; paid orders stay unchanged. The whole file is validated before saving. Maximum 100 offers and 1 MB.')}</p><label>{w('Формат', 'Format')}<select value={format} onChange={e => { setFormat(e.target.value); setContent(''); preview.reset() }}>{['json', 'xml', 'csv'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}</select></label><Button variant="outline" disabled={exporting.isPending} onClick={() => exporting.mutate()}>{w('Экспорт тарифов', 'Export offers')}</Button><label>{w('Файл для импорта', 'Import file')}<input type="file" accept={'.' + format} onChange={async e => { const file = e.target.files?.[0]; preview.reset(); setContent(''); setFileError(''); if (file) { if (file.size > 1_000_000) setFileError(w('Файл больше 1 МБ.', 'File exceeds 1 MB.')); else setContent(await file.text()) } }} /></label>{fileError && <p role="alert">{fileError}</p>}<Button disabled={!content || preview.isPending} onClick={() => preview.mutate(false)}>{w('Проверить файл', 'Validate file')}</Button><StaffError error={preview.error || exporting.error} />
    {preview.data && <><p role="status">{preview.data.applied ? w('Импорт завершён.', 'Import complete.') : w('Файл проверен.', 'File validated.')} {w('Новых', 'New')}: {preview.data.created}; {w('Обновлений', 'Updates')}: {preview.data.updated}</p><DataTable rows={preview.data.offers} columns={[[ 'code', w('Код', 'Code')], ['format', w('Формат', 'Format')], ['zones', w('Зоны', 'Zones')], ['price_byn', w('Цена BYN', 'Price BYN')], ['is_active', w('Активен', 'Active')]]} />{!preview.data.applied && <Button disabled={preview.isPending} onClick={() => preview.mutate(true)}>{w('Применить импорт', 'Apply import')}</Button>}</>}
  </>
}
