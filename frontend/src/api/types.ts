// API DTOs, not database records. BIGINT and NUMERIC cross JSON as strings.
import type { CommerceApi } from './commerce-types'
export type { Cart, CartItem, Order } from './commerce-types'
export type Id = string
export type Money = string
export type Locale = 'ru' | 'en'
export type Role = 'CLIENT' | 'TRAINER' | 'ADMIN'
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'attended' | 'no_show'
export type Currency = 'BYN' | 'USD' | 'EUR'
export type AccessOfferPreview = {
  zones: 'gym' | 'pool' | 'both'
  price_byn: Money
} & ({ format: 'membership'; months: 1 | 3 | 12 } | { format: 'single_visit'; months: null })
export interface User { id: Id; email: string; role: Role; first_name: string; last_name: string; phone: string | null; locale: Locale; is_active: boolean; email_verified_at: string | null }
export interface Trainer { user_id: Id; first_name: string; last_name: string; name_ru: string; name_en: string; experience_years: number; specialization_ru: string; specialization_en: string; bio_ru: string; bio_en: string }
export interface Plan { id: Id; code: string; name_ru: string; name_en: string; description_ru: string; description_en: string; duration_months: 1 | 3 | 12; price_byn: Money; allows_individual: boolean; allows_group: boolean; is_active: boolean; is_featured?: boolean }
export interface ClubContent {
  image: string
  location_ru: string
  location_en: string
  hours: string
  zones: { id: 'gym' | 'cardio' | 'aquatics'; title_ru: string; title_en: string; description_ru: string; description_en: string }[]
  amenities: { title_ru: string; title_en: string; description_ru: string; description_en: string }
}
export interface Slot { id: Id; trainer_id: Id; title_ru: string; title_en: string; training_type: 'individual' | 'group'; starts_at: string; ends_at: string; capacity: number; status: 'scheduled' | 'cancelled' | 'completed'; reserved_count: number; trainer_name: string }
export interface Membership { id: Id; client_id: Id; starts_at: string; ends_at: string; cancelled_at: string | null; plan_name_ru: string; plan_name_en: string; allows_individual: boolean; allows_group: boolean; zones?: 'gym' | 'pool' | 'both'; order_id?: Id }
export interface Booking { id: Id; membership_id: Id; training_slot_id: Id; status: BookingStatus; created_at: string; client_name: string; slot: Slot; requires_attention: boolean; reason: string | null }
export interface Notification { id: Id; recipient_user_id: Id; title_ru: string; title_en: string; body_ru: string; body_en: string; created_at: string; read_at: string | null }
export interface Discount { id: Id; code: string; kind: 'percent' | 'fixed'; value: string; is_active: boolean }
export interface ExchangeRate { id: Id; currency: 'USD' | 'EUR'; byn_per_unit: string; effective_at: string }
export interface Analytics { revenue_byn: Money; active_memberships: number; clients: number; attendance: number; weeks: { label: string; revenue_byn: Money }[] }
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { first_name: string; last_name: string; locale: Locale }
export interface SlotInput { title_ru: string; title_en: string; training_type: Slot['training_type']; starts_at: string; ends_at: string; capacity: number }
export interface BookingDecision { status: Exclude<BookingStatus, 'pending'>; reason?: string }
export interface ClubApi extends CommerceApi {
  accessOfferPreviews(): Promise<AccessOfferPreview[]>;
  session(): Promise<User | null>; login(input: LoginInput): Promise<User>; register(input: RegisterInput): Promise<User>; logout(): Promise<void>; verifyDemoEmail(): Promise<User>;
  profile(input: Pick<User, 'first_name' | 'last_name' | 'phone' | 'locale'>): Promise<User>;
  club(): Promise<ClubContent>; plans(): Promise<Plan[]>; trainers(): Promise<Trainer[]>; slots(): Promise<Slot[]>;
  memberships(): Promise<Membership[]>; bookings(): Promise<Booking[]>;
  book(input: { training_slot_id: Id }): Promise<Booking>; decide(id: Id, input: BookingDecision): Promise<Booking>;
  createSlot(input: SlotInput): Promise<Slot>; cancelSlot(id: Id): Promise<void>;
  notifications(): Promise<Notification[]>; readNotification(id: Id): Promise<void>;
  users(): Promise<User[]>; setUserActive(id: Id, active: boolean): Promise<User>;
  setPlanActive(id: Id, active: boolean): Promise<Plan>; discounts(): Promise<Discount[]>; setDiscountActive(id: Id, active: boolean): Promise<Discount>;
  rates(): Promise<ExchangeRate[]>; analytics(): Promise<Analytics>;
}
export class ApiError extends Error {
  constructor(public code: string, public status = 400) { super(code); this.name = 'ApiError' }
}
