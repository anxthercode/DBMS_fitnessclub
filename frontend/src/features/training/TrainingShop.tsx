import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { isMock } from '@/api'
import { request } from '@/api/http'
import type { Cart } from '@/api/commerce-types'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { useCommerceAction } from '@/features/commerce/hooks'
import { CommerceError, ZoneBadges } from '@/features/commerce/shared'
import { useSession } from '@/features/auth/session'
import { usePrivateQuery } from './hooks'
import { DataTable, useWords, type Row } from '@/features/staff/shared'

export function TrainingShop() {
  const w = useWords()
  const session = useSession()
  const navigate = useNavigate()
  const offers = useQuery({ queryKey: ['training-offers'], queryFn: () => request<{ id: string; zones: 'gym' | 'pool'; price_byn: string; revision: number }[]>('/training-offers'), enabled: !isMock })
  const credits = usePrivateQuery(['training-credits'], () => request<Row[]>('/training-credits'), !isMock)
  const add = useCommerceAction((offer: NonNullable<typeof offers.data>[number]) => request<Cart>('/cart/items', 'PUT', { selection: { format: 'training', zones: offer.zones, months: null, date: null }, expected_price_byn: offer.price_byn, expected_revision: offer.revision, idempotency_key: crypto.randomUUID() }), () => navigate('/cart'))
  return <section className="container-shell page-section training-page"><h1 className="page-title">{w('Персональные тренировки', 'Personal training')}</h1><p className="commerce-intro">{w('Одно занятие — 60 минут с тренером в выбранной зоне. Сначала оплатите, затем выберите свободное время. Для записи нужен абонемент, покрывающий всю тренировку и её зону. Оплаченное занятие не имеет срока действия.', 'One session is 60 minutes with a trainer in the selected zone. Pay first, then choose an available time. Booking requires a membership covering the full session and zone. Paid sessions do not expire.')}</p><Link className="training-link" to="/schedule">{w('Посмотреть расписание', 'View schedule')} ↗</Link>
    {isMock ? <p>{w('Покупка занятий доступна при подключении к серверу.', 'Session purchases require a server connection.')}</p> : offers.isPending ? <Loading /> : offers.isError ? <QueryError retry={() => void offers.refetch()} /> : <div className="commerce-items mt-6">{offers.data.map(offer => <article className="commerce-card" key={offer.id}><ZoneBadges zones={offer.zones} /><h2>{w('60 минут · 1 занятие', '60 minutes · 1 session')}</h2><p className="product-price">{offer.price_byn} BYN</p><Button disabled={add.isPending || !!session.data && session.data.role !== 'CLIENT'} onClick={() => add.mutate(offer)}>{w('Добавить тренировку в корзину', 'Add training to cart')}</Button></article>)}</div>}
    <CommerceError error={add.error} />
    {session.data?.role === 'CLIENT' && !isMock && <section className="mt-8"><h2>{w('Мои оплаченные занятия', 'My paid sessions')}</h2>{credits.isPending ? <Loading /> : credits.isError ? <QueryError retry={() => void credits.refetch()} /> : <DataTable rows={credits.data} columns={[[ 'id', '№'], ['zone', w('Зона', 'Zone')], ['status', w('Состояние', 'Status')], ['order_id', w('Заказ', 'Order')]]} actions={r => r.status === 'available' ? <Link className="training-link" to={'/schedule?zone=' + r.zone}>{w('Выбрать время', 'Choose a time')}</Link> : r.booking_id ? <Link className="training-link" to={'/account/bookings/' + r.booking_id}>{w('Заявка', 'Booking')}</Link> : null} />}</section>}
  </section>
}
