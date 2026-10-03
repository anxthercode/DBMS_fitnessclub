import type { Currency, Id, Money } from './types'

export type Zones = 'gym' | 'pool' | 'both'
export type Selection = { zones: Zones; date: string } & (
  { format: 'membership'; months: 1 | 3 | 12 } | { format: 'single_visit'; months: null }
)
export type Offer = Omit<Selection, 'date'> & {
  id: Id; revision: number; price_byn: Money; is_active: boolean
  allows_group: boolean; allows_individual: boolean
}
export type Product = Selection & {
  offer_id: Id; offer_revision: number; price_byn: Money
  starts_at: string; ends_at: string; allows_group: boolean; allows_individual: boolean
  amenities_included: true; single_entry: boolean
}
export interface CartItem { id: Id; product: Product }
export interface Cart { id: Id; version: number; items: CartItem[] }
export interface Quote {
  cart_version: number; subtotal_byn: Money; discount_byn: Money; total_byn: Money
  promo_code: string | null; currency: Currency; total_currency: Money
  byn_per_unit: string; rate_date: string | null
}
export interface PaymentAttempt { id: Id; created_at: string; status: 'succeeded' | 'failed'; reason: string | null }
export interface Order extends Quote {
  id: Id; client_id: Id; status: 'pending' | 'paid' | 'cancelled'; created_at: string
  items: CartItem[]; attempts: PaymentAttempt[]; access_ids: Id[]
}
export interface AccessGrant {
  id: Id; client_id: Id; format: 'membership' | 'single_visit'; zones: Zones
  starts_at: string; ends_at: string; cancelled_at: string | null; redeemed_at: string | null
  allows_group: boolean; allows_individual: boolean; order_id: Id | null; product: Product | null
}
export interface PutCartItem { selection: Selection; expected_price_byn: Money; expected_revision: number; item_id?: Id; cart_version?: number; idempotency_key: string }
export interface QuoteInput { cart_version: number; promo_code?: string; currency: Currency }
export interface CheckoutInput extends QuoteInput { idempotency_key: string; expected_total_byn: Money; expected_total_currency: Money; expected_rate: string }
export interface CommerceApi {
  offers(): Promise<Offer[]>
  cart(): Promise<Cart>
  putCartItem(input: PutCartItem): Promise<Cart>
  removeCartItem(id: Id, version: number): Promise<Cart>
  refreshCart(version: number): Promise<Cart>
  quote(input: QuoteInput): Promise<Quote>
  checkout(input: CheckoutInput): Promise<Order>
  orders(): Promise<Order[]>
  order(id: Id): Promise<Order>
  cancelOrder(id: Id): Promise<Order>
  pay(id: Id, input: { successful: boolean; idempotency_key: string }): Promise<Order>
  accesses(): Promise<AccessGrant[]>
}
