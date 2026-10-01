import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { isMock } from '@/api'
import type { Trainer } from '@/api/types'
import { localized } from '@/lib/format'
import { homeCopy } from '@/features/public/home-content'
import './trainers.css'

// Concept portraits belong only to these fictional fixtures, never to live API identities.
const portraits: Record<string, string> = { '2': 'coach-artem', '3': 'coach-anna', '7': 'coach-mikhail' }

export function TrainerProfiles({ trainers, headingLevel = 'h2' }: { trainers: Trainer[]; headingLevel?: 'h2' | 'h3' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const Heading = headingLevel
  return <>
    <div className="trainer-grid">
      {trainers.map(coach => {
        const portrait = isMock ? portraits[coach.user_id] : undefined
        return <article className="trainer-profile" key={coach.user_id}>
          <div className="trainer-portrait">
            {portrait ? <img src={`/images/home/${portrait}.webp`} alt="" width="640" height="960" loading="lazy" decoding="async" /> : <UserRound size={64} strokeWidth={1} aria-hidden="true" />}
            <p className="trainer-experience">{t('coaches.experience', { count: coach.experience_years })}</p>
          </div>
          <Heading>{localized(coach, 'name', locale)}</Heading>
          <p className="trainer-specialization">{localized(coach, 'specialization', locale)}</p>
          <p className="trainer-bio">{localized(coach, 'bio', locale)}</p>
        </article>
      })}
    </div>
    {isMock && <p className="trainer-demo-note">{homeCopy[locale].coachesDemo}</p>}
  </>
}
