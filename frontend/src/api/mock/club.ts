import type { ClubContent } from '../types'

export const clubContent: ClubContent = {
  image: '/images/club.jpg',
  location_ru: 'Минск, Беларусь',
  location_en: 'Minsk, Belarus',
  hours: '07:00–23:00',
  zones: [
    {
      id: 'gym',
      title_ru: 'Тренажёрный зал',
      title_en: 'Gym floor',
      description_ru: 'Свободные веса, силовые тренажёры и место для функциональных упражнений. Занимайся самостоятельно или с тренером.',
      description_en: 'Free weights, resistance machines and space for functional exercises. Train on your own or with a coach.',
    },
    {
      id: 'cardio',
      title_ru: 'Кардиозона',
      title_en: 'Cardio zone',
      description_ru: 'Беговые дорожки, велотренажёры и эллипсы. Разминка, работа над выносливостью или кардио в своём темпе.',
      description_en: 'Treadmills, exercise bikes and cross-trainers. Warm up, build endurance or find your own cardio pace.',
    },
    {
      id: 'aquatics',
      title_ru: 'Зона водных программ',
      title_en: 'Aquatics zone',
      description_ru: 'Бассейн для плавания и аквааэробики. Добавь к привычным тренировкам движение в воде.',
      description_en: 'A pool for swimming and aqua aerobics. Bring movement in the water into your training routine.',
    },
  ],
  amenities: {
    title_ru: 'Просторные раздевалки и душевые',
    title_en: 'Spacious changing rooms & showers',
    description_ru: 'Переоденься перед занятием, оставь вещи в шкафчике и освежись после тренировки. Всё для комфортного посещения клуба.',
    description_en: 'Get changed before your session, leave your belongings in a locker and freshen up afterwards. Everything for a comfortable club visit.',
  },
}
