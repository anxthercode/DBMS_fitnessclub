import type { User, Trainer, Plan, Slot, Membership, Booking, Order, Discount, ExchangeRate, Notification } from '../types'
import { demoAccounts } from './demo'
export { demoAccounts, demoPassword } from './demo'
export function createFixtures(now: number) {
  const iso = (days: number, hour = 18) => { const d = new Date(now); d.setUTCHours(hour - 3, 0, 0, 0); d.setUTCDate(d.getUTCDate() + days); return d.toISOString() }
  const users: User[] = [
    { id: '1', email: demoAccounts.CLIENT, first_name: 'Александра', last_name: 'Миронова', role: 'CLIENT', phone: '+375 29 555-01-20', locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '2', email: demoAccounts.TRAINER, first_name: 'Артём', last_name: 'Волков', role: 'TRAINER', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '3', email: 'anna@forma.demo', first_name: 'Анна', last_name: 'Белова', role: 'TRAINER', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '4', email: demoAccounts.ADMIN, first_name: 'Мария', last_name: 'Соколова', role: 'ADMIN', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '5', email: 'max@forma.demo', first_name: 'Максим', last_name: 'Орлов', role: 'CLIENT', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
    { id: '6', email: 'elena@forma.demo', first_name: 'Елена', last_name: 'Ким', role: 'CLIENT', phone: null, locale: 'ru', is_active: true, email_verified_at: iso(-30) },
  ]
  const trainers: Trainer[] = [
    { user_id: '2', name_ru: 'Артём Волков', name_en: 'Artem Volkov', experience_years: 8, first_name: 'Артём', last_name: 'Волков', specialization_ru: 'Силовые и функциональные тренировки', specialization_en: 'Strength & functional training', bio_ru: 'Проводит силовые и функциональные занятия. Основные направления — техника упражнений и последовательное увеличение нагрузки.', bio_en: 'Leads strength and functional sessions, focusing on exercise technique and gradual progression.' },
    { user_id: '3', name_ru: 'Анна Белова', name_en: 'Anna Belova', experience_years: 6, first_name: 'Анна', last_name: 'Белова', specialization_ru: 'Пилатес, йога и мобильность', specialization_en: 'Pilates, yoga & mobility', bio_ru: 'Проводит занятия по пилатесу, йоге и мобильности. Основные направления — гибкость, баланс и контроль движений.', bio_en: 'Leads Pilates, yoga and mobility sessions, focusing on flexibility, balance and movement control.' },
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
  ]
  const slots: Slot[] = definitions.map(([title_ru,title_en,trainer_id,day,hour,training_type,capacity],i) => ({ id:String(i+1), title_ru,title_en,trainer_id, starts_at:iso(day,hour), ends_at:iso(day,hour+1),training_type,capacity,status:'scheduled',reserved_count:0,trainer_name: trainer_id === '2' ? 'Артём Волков' : 'Анна Белова' }))
  const memberships: Membership[] = ['1','5','6'].map((client_id,i) => ({ id:String(i+1),client_id,starts_at:iso(-15),ends_at:iso(75),cancelled_at:null,plan_name_ru:'Ритм',plan_name_en:'Rhythm',allows_group:true,allows_individual:true }))
  memberships.push(
    { id: '4', client_id: '1', starts_at: iso(-60), ends_at: iso(-30), cancelled_at: null, plan_name_ru: 'Старт', plan_name_en: 'Start', allows_group: true, allows_individual: false },
    { id: '5', client_id: '1', starts_at: iso(75), ends_at: iso(165), cancelled_at: null, plan_name_ru: 'Ритм', plan_name_en: 'Rhythm', allows_group: true, allows_individual: true },
    { id: '6', client_id: '1', starts_at: iso(-160), ends_at: iso(-130), cancelled_at: iso(-150), plan_name_ru: 'Старт', plan_name_en: 'Start', allows_group: true, allows_individual: false },
  )
  const booking = (id:string, membership_id:string, slotIndex:number, status:Booking['status'], old=false): Booking => ({ id,membership_id, training_slot_id:slots[slotIndex].id, status,created_at:old ? iso(-2) : new Date(now).toISOString(),client_name:users.find(u=>u.id===memberships.find(m=>m.id===membership_id)?.client_id)!.first_name,slot:slots[slotIndex],requires_attention:old,reason:null })
  const bookings: Booking[] = [booking('1','1',2,'approved'),booking('2','2',0,'pending',true),booking('3','3',4,'approved'),booking('4','1',10,'approved'),booking('5','1',5,'pending')]
  const orders: Order[] = [{ id:'1001',client_id:'1',status:'paid',created_at:iso(-15),total_byn:'320.00',discount_byn:'0.00',items:[{ name_ru:'Ритм',name_en:'Rhythm',quantity:1,duration_months:3,allows_group:true,allows_individual:true,unit_price_byn:'320.00' }] }]
  const discounts: Discount[] = [{id:'1',code:'FORMA10',kind:'percent',value:'10',is_active:true}]
  const rates: ExchangeRate[] = [{id:'1',currency:'USD',byn_per_unit:'3.25000000',effective_at:iso(-1)}, {id:'2',currency:'EUR',byn_per_unit:'3.60000000',effective_at:iso(-1)}]
  const notifications: Notification[] = [{id:'1',recipient_user_id:'1',title_ru:'Вы записаны на тренировку',title_en:'Your training is confirmed',body_ru:'Силовая тренировка с Артёмом. До встречи в клубе!',body_en:'Strength training with Artem. See you at the club!',created_at:iso(-1),read_at:null}]
  return { users, trainers, plans, slots, memberships, bookings, orders, discounts, rates, notifications }
}
