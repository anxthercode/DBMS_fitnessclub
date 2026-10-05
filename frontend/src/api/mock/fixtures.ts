import type { User, Trainer, Plan, Slot, Membership, Booking, Order, Discount, ExchangeRate, Notification } from '../types'
import { demoAccounts } from './demo'
export { demoAccounts, demoPassword } from './demo'
export function createFixtures(now: number) {
  const iso = (days: number, hour = 18) => { const d = new Date(now + 10_800_000); d.setUTCHours(hour - 3, 0, 0, 0); d.setUTCDate(d.getUTCDate() + days); return d.toISOString() }
  const users: User[] = [
    { id: '1', email: demoAccounts.CLIENT, first_name: 'Александра', last_name: 'Миронова', role: 'CLIENT', phone: '+375 29 555-01-20', locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '2', email: demoAccounts.TRAINER, first_name: 'Артём', last_name: 'Волков', role: 'TRAINER', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '3', email: 'anna@northside.demo', first_name: 'Анна', last_name: 'Белова', role: 'TRAINER', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '4', email: demoAccounts.ADMIN, first_name: 'Мария', last_name: 'Соколова', role: 'ADMIN', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '5', email: 'max@northside.demo', first_name: 'Максим', last_name: 'Орлов', role: 'CLIENT', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '6', email: 'elena@northside.demo', first_name: 'Елена', last_name: 'Ким', role: 'CLIENT', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '7', email: 'mikhail@northside.demo', first_name: 'Михаил', last_name: 'Соколов', role: 'TRAINER', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
  ]
  const trainers: Trainer[] = [
    { user_id: '2', name_ru: 'Артём Волков', name_en: 'Artem Volkov', experience_years: 8, first_name: 'Артём', last_name: 'Волков', specialization_ru: 'Силовые и функциональные тренировки', specialization_en: 'Strength & functional training', bio_ru: 'Проводит силовые и функциональные занятия. Основные направления — техника упражнений и последовательное увеличение нагрузки.', bio_en: 'Leads strength and functional sessions, focusing on exercise technique and gradual progression.' },
    { user_id: '3', name_ru: 'Анна Белова', name_en: 'Anna Belova', experience_years: 6, first_name: 'Анна', last_name: 'Белова', specialization_ru: 'Пилатес, йога и мобильность', specialization_en: 'Pilates, yoga & mobility', bio_ru: 'Проводит занятия по пилатесу, йоге и мобильности. Основные направления — гибкость, баланс и контроль движений.', bio_en: 'Leads Pilates, yoga and mobility sessions, focusing on flexibility, balance and movement control.' },
    { user_id: '7', name_ru: 'Михаил Соколов', name_en: 'Mikhail Sokolov', experience_years: 7, first_name: 'Михаил', last_name: 'Соколов', specialization_ru: 'Плавание и аквааэробика', specialization_en: 'Swimming & aqua aerobics', bio_ru: 'Помогает освоиться в воде и работать над техникой плавания. Проводит водные занятия с постепенным увеличением нагрузки.', bio_en: 'Helps you feel comfortable in the water and work on swimming technique. Leads aquatic sessions with gradual progression.' },
  ]
  const plans: Plan[] = [
    { id: '1', code: 'START', name_ru: 'Старт', name_en: 'Start', description_ru: 'Найди свой ритм и попробуй новое.', description_en: 'Find your rhythm. Try something new.', duration_months: 1, price_byn: '120.00', allows_group: true, allows_individual: false, is_active: true },
    { id: '2', code: 'RHYTHM', is_featured: true, name_ru: 'Ритм', name_en: 'Rhythm', description_ru: 'Преврати движение в любимую привычку.', description_en: 'Make movement your favourite habit.', duration_months: 3, price_byn: '320.00', allows_group: true, allows_individual: true, is_active: true },
    { id: '3', code: 'ENERGY', name_ru: 'Энергия', name_en: 'Energy', description_ru: 'Целый год заботы о себе и новых целей.', description_en: 'A whole year of showing up for yourself.', duration_months: 12, price_byn: '1080.00', allows_group: true, allows_individual: true, is_active: true },
  ]
  const definitions: [string,string,string,number,number,'group'|'individual',number][] = [
    ['Функциональный тренинг','Functional training','2',1,9,'group',12], ['Пилатес','Pilates','3',1,10,'group',10], ['Силовая тренировка','Strength training','2',1,18,'group',8], ['Мягкая йога','Gentle yoga','3',1,18,'group',10],
    ['Персональная тренировка','Personal training','2',2,12,'individual',1], ['Пилатес','Pilates','3',2,19,'group',10], ['Функциональный тренинг','Functional training','2',3,18,'group',12], ['Мобильность','Mobility','3',3,19,'group',10],
    ['Силовая тренировка','Strength training','2',4,18,'group',8], ['Мягкая йога','Gentle yoga','3',5,11,'group',10], ['Функциональный тренинг','Functional training','2',-1,18,'group',12],
    ['Аквааэробика','Aqua aerobics','7',1,9,'group',6], ['Техника плавания','Swimming technique','7',2,16,'individual',1],
    ['Плавание в группе','Group swimming','7',3,18,'group',6],
    ['Пилатес','Pilates','3',-2,10,'group',10], ['Силовая тренировка','Strength training','2',-3,18,'group',8],
    ['Аквааэробика','Aqua aerobics','7',4,10,'group',6],

  ]
  const slots: Slot[] = definitions.map(([title_ru,title_en,trainer_id,day,hour,training_type,capacity],i) => ({ zone: trainer_id === '7' ? 'pool' : 'gym', id:String(i+1), title_ru,title_en,trainer_id, starts_at:iso(day,hour), ends_at:iso(day,hour+1),training_type,capacity,status: day < 0 ? 'completed' : 'scheduled',reserved_count:0,trainer_name: trainers.find(t => t.user_id === trainer_id)!.name_ru }))
  const memberships: Membership[] = ['1','5','6'].map((client_id,i) => ({ id:String(i+1),client_id,starts_at:iso(-15),ends_at:iso(75),cancelled_at:null,plan_name_ru:'Ритм',plan_name_en:'Rhythm',allows_group:true,allows_individual:true }))
  memberships.push(
    { id: '4', client_id: '1', starts_at: iso(-60), ends_at: iso(-30), cancelled_at: null, plan_name_ru: 'Старт', plan_name_en: 'Start', allows_group: true, allows_individual: false },
    { id: '5', client_id: '1', starts_at: iso(75), ends_at: iso(165), cancelled_at: null, plan_name_ru: 'Ритм', plan_name_en: 'Rhythm', allows_group: true, allows_individual: true },
    { id: '6', client_id: '1', starts_at: iso(-160), ends_at: iso(-130), cancelled_at: iso(-150), plan_name_ru: 'Старт', plan_name_en: 'Start', allows_group: true, allows_individual: false },
  )
  const booking = (id:string, membership_id:string, slotIndex:number, status:Booking['status'], old=false): Booking => ({ id,membership_id, training_slot_id:slots[slotIndex].id, status,created_at:old ? iso(-2) : new Date(now).toISOString(),client_name:users.find(u=>u.id===memberships.find(m=>m.id===membership_id)?.client_id)!.first_name,slot:slots[slotIndex],requires_attention:old,reason:null })
  const bookings: Booking[] = [booking('1','1',2,'approved'),booking('2','2',0,'pending',true),booking('3','3',4,'approved'),booking('4','1',10,'attended'),booking('5','1',5,'pending'),booking('6','1',14,'no_show'),booking('7','1',13,'rejected'),booking('8','1',15,'cancelled')]
  memberships[0].order_id = '1001'
  const orders: Order[] = [{
    id: '1001', client_id: '1', status: 'paid', created_at: iso(-15), cart_version: 1,
    subtotal_byn: '320.00', total_byn: '320.00', discount_byn: '0.00', promo_code: null,
    currency: 'BYN', total_currency: '320.00', byn_per_unit: '1.00000000', rate_date: null,
    items: [{ id: 'legacy-1001-1', product: {
      format: 'membership', months: 3, zones: 'both', date: iso(-15).slice(0, 10), offer_id: '6',
      offer_revision: 1, price_byn: '320.00', starts_at: iso(-15), ends_at: iso(75),
      allows_group: true, allows_individual: true, amenities_included: true, single_entry: false,
    } }],
    attempts: [{ id: 'legacy-payment', status: 'succeeded', created_at: iso(-15), reason: null }],
    access_ids: ['membership-1'],
  }]
  const discounts: Discount[] = [{id:'1',code:'NORTHSIDE10',kind:'percent',value:'10',is_active:true}]
  const rates: ExchangeRate[] = [{id:'1',currency:'USD',byn_per_unit:'3.25000000',effective_at:iso(-1)}, {id:'2',currency:'EUR',byn_per_unit:'3.60000000',effective_at:iso(-1)}]
  const notifications: Notification[] = [{id:'1',recipient_user_id:'1',target:{kind:'booking',id:'1'},title_ru:'Вы записаны на тренировку',title_en:'Your training is confirmed',body_ru:'Силовая тренировка с Артёмом. До встречи в клубе!',body_en:'Strength training with Artem. See you at the club!',created_at:iso(-1),read_at:null}]
  return { users, trainers, plans, slots, memberships, bookings, orders, discounts, rates, notifications }
}
