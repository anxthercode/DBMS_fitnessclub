import { useTranslation } from 'react-i18next'
export const trainingCopy = {
  ru: {
    schedule: 'Расписание', intro: 'Выберите занятие. Время указано по Минску. Заявку подтверждает тренер; ожидающие заявки тоже занимают места.',
    date: 'Дата занятия', trainer: 'Тренер', format: 'Формат', zone: 'Зона', all: 'Все', group: 'Групповое', individual: 'Индивидуальное',
    gym: 'Зал + кардио', pool: 'Бассейн', available: 'Свободно мест', full: 'Мест нет', details: 'Открыть занятие', noSlots: 'Занятий по этим условиям нет.', reset: 'Сбросить фильтры',
    slot: 'Занятие', request: 'Отправить заявку', signIn: 'Войти для записи', signInNote: 'После входа или регистрации вы вернётесь к этому занятию.',
    access: 'Проверка доступа', eligible: 'Ваш абонемент подходит. Можно отправить заявку.', verify: 'Имитировать подтверждение email', verifyNote: 'В деморежиме письмо не отправляется. Эта кнопка подтверждает email только внутри текущей демонстрации.',
    choose: 'Выбрать абонемент', booking: 'Заявка', bookings: 'Мои тренировки', noBookings: 'Заявок пока нет.', upcoming: 'Предстоящие', history: 'История',
    pending: 'Ожидает решения', approved: 'Подтверждена', rejected: 'Отклонена', cancelled: 'Отменена', attended: 'Завершена · посещено', no_show: 'Завершена · неявка',
    cancel: 'Отменить запись', reason: 'Причина отмены', cancelRule: 'Отмена доступна не позднее чем за 12 часов до начала, с указанием причины.', late: 'До начала меньше 12 часов. Самостоятельная отмена уже недоступна.',
    attention: 'Заявка требует внимания: решение не принято более 12 часов или занятие уже началось.',
    demo: 'Демонстрация решения тренера', demoNote: 'Это тестовый сценарий, а не действие настоящего тренера. Он меняет только вашу заявку и связанные уведомления.', approve: 'Имитировать одобрение', reject: 'Имитировать отказ',
    demo_rejected: 'Демонстрационный отказ тренера.', slot_cancelled: 'Занятие отменено.', current: 'Статус', membership: 'Абонемент для записи',
    overview: 'Обзор кабинета', welcome: 'Ваши посещения и тренировки', currentAccess: 'Текущий и будущий доступ', nextBooking: 'Ближайшая тренировка', latestOrders: 'Последние заказы', latestNotifications: 'Последние уведомления', none: 'Пока нет записей.', openAll: 'Открыть все',
    notifications: 'Уведомления', unread: 'Непрочитанные', read: 'Прочитано', markRead: 'Отметить прочитанным', related: 'Открыть запись', noNotifications: 'Уведомлений пока нет.',
    repeat: 'Купить снова', renew: 'Продлить', repeatNote: 'Проверьте новый срок, дату и актуальную цену. Покупка создаст отдельный заказ.', renewNote: 'Дата предложена после окончания выбранного абонемента. Проверьте её: другие абонементы в тех же зонах могут пересекаться.',
    account: 'Перейти в кабинет', busy: 'Подождите…', demoAuth: 'Демонстрация авторизации', expire: 'Имитировать завершение сессии', expired: 'Демосессия завершена. Войдите снова, чтобы продолжить.',
    recovery: 'Восстановление пароля', recoveryLink: 'Забыли пароль?', email: 'Электронная почта', recover: 'Проверить демосценарий', recovered: 'Сценарий восстановления показан. Письмо не отправлено, пароль не изменён. Используйте прежний демопароль или зарегистрируйте тестовый аккаунт.', recoveryNote: 'Восстановление здесь демонстрационное. Отправка письма и изменение пароля появятся после подключения сервера.', backLogin: 'Вернуться ко входу',
    errors: { membership_required: 'Нужен неотменённый абонемент, покрывающий всё занятие. Разовое посещение не подходит.', zone_required: 'В абонементе нет зоны этого занятия.', training_permission: 'Абонемент не разрешает этот формат тренировки.', booking_overlap: 'У вас уже есть ожидающая или подтверждённая заявка на это время.', slot_full: 'Все места уже заняты.', slot_unavailable: 'Занятие отменено, завершено или уже началось.', verify_email: 'Сначала подтвердите email.', cancellation_deadline: 'Отменить можно не позднее чем за 12 часов до начала.', reason_required: 'Укажите причину от 1 до 500 символов.', booking_changed: 'Статус заявки уже изменился. Обновите данные.', unauthorized: 'Сессия завершена. Войдите снова.', forbidden: 'Это действие недоступно для вашей роли.', not_found: 'Запись не найдена или принадлежит другому пользователю.', invalid_email: 'Введите корректный email.', unknown: 'Не удалось выполнить действие. Попробуйте ещё раз.' },
  },
  en: {
    schedule: 'Schedule', intro: 'Choose a session. Times are shown in Minsk time. The trainer reviews your request; pending requests also reserve places.',
    date: 'Session date', trainer: 'Coach', format: 'Format', zone: 'Zone', all: 'All', group: 'Group', individual: 'Individual',
    gym: 'Gym + cardio', pool: 'Pool', available: 'Places available', full: 'Fully booked', details: 'View session', noSlots: 'No sessions match these filters.', reset: 'Reset filters',
    slot: 'Session', request: 'Request a place', signIn: 'Sign in to book', signInNote: 'Sign-in or registration will return you to this session.',
    access: 'Access check', eligible: 'Your membership qualifies. You can request a place.', verify: 'Simulate email verification', verifyNote: 'No email is sent in demo mode. This button verifies your email only within this demonstration.',
    choose: 'Choose membership', booking: 'Booking', bookings: 'My training', noBookings: 'No bookings yet.', upcoming: 'Upcoming', history: 'History',
    pending: 'Awaiting decision', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', attended: 'Completed · attended', no_show: 'Completed · no-show',
    cancel: 'Cancel booking', reason: 'Cancellation reason', cancelRule: 'Cancel at least 12 hours before the start, with a reason.', late: 'Less than 12 hours remain. Self-service cancellation is no longer available.',
    attention: 'This request needs attention: it has waited over 12 hours or the session has started.',
    demo: 'Simulate a trainer decision', demoNote: 'This is a test scenario, not a real trainer action. It changes only your request and related notifications.', approve: 'Simulate approval', reject: 'Simulate rejection',
    demo_rejected: 'Demonstration trainer rejection.', slot_cancelled: 'The session was cancelled.', current: 'Status', membership: 'Booking membership',
    overview: 'Account overview', welcome: 'Your visits and training', currentAccess: 'Current and upcoming access', nextBooking: 'Next training session', latestOrders: 'Recent orders', latestNotifications: 'Recent notifications', none: 'Nothing here yet.', openAll: 'View all',
    notifications: 'Notifications', unread: 'Unread', read: 'Read', markRead: 'Mark as read', related: 'Open record', noNotifications: 'No notifications yet.',
    repeat: 'Buy again', renew: 'Renew', repeatNote: 'Review the new term, date and current price. Purchasing creates a separate order.', renewNote: 'The suggested date follows the selected membership. Review it: other memberships in the same zones may overlap.',
    account: 'Open account', busy: 'Please wait…', demoAuth: 'Authentication demo', expire: 'Simulate session expiry', expired: 'Your demo session expired. Sign in again to continue.',
    recovery: 'Password recovery', recoveryLink: 'Forgot password?', email: 'Email address', recover: 'Try recovery demo', recovered: 'Recovery scenario shown. No email was sent and your password has not changed. Use your previous demo password or register a test account.', recoveryNote: 'This is a demonstration. Sending recovery emails and changing passwords will be available after backend integration.', backLogin: 'Back to sign-in',
    errors: { membership_required: 'You need a non-cancelled membership covering the entire session. Single visits do not qualify.', zone_required: 'Your membership does not include this session’s zone.', training_permission: 'Your membership does not allow this training format.', booking_overlap: 'You already have a pending or approved booking at this time.', slot_full: 'All places have been reserved.', slot_unavailable: 'The session was cancelled, completed or has already started.', verify_email: 'Verify your email first.', cancellation_deadline: 'Cancel at least 12 hours before the start.', reason_required: 'Enter a reason of 1–500 characters.', booking_changed: 'The booking status has changed. Refresh the details.', unauthorized: 'Your session expired. Sign in again.', forbidden: 'Your role cannot perform this action.', not_found: 'Record not found or owned by another user.', invalid_email: 'Enter a valid email address.', unknown: 'The action failed. Please try again.' },
  },
} as const
export function useTrainingCopy() {
  const { i18n } = useTranslation()
  const locale: 'ru' | 'en' = i18n.language === 'en' ? 'en' : 'ru'
  return { copy: trainingCopy[locale], locale }
}
