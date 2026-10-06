import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { isMock } from '@/api'
import type { Trainer } from '@/api/types'
import { localized } from '@/lib/format'
import { homeCopy } from '@/features/public/home-content'
import './trainers.css'

// Concept portraits belong only to these fictional fixtures, never to live API identities.
const portraits: Record<string, { file: string; width: number; height: number }> = {
  '2': { file: 'trainer-01', width: 843, height: 1264 },
  '3': { file: 'trainer-03', width: 1408, height: 768 },
  '7': { file: 'trainer-02', width: 1408, height: 768 },
}

export function TrainerProfiles({ trainers, headingLevel = 'h2', showDemoNote = true, compact = false }: { trainers: Trainer[]; headingLevel?: 'h2' | 'h3'; showDemoNote?: boolean; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const Heading = headingLevel
  return <>
    <div className={'trainer-grid' + (compact ? ' trainer-grid-compact' : '')}>
      {trainers.map((coach, index) => {
        const portrait = isMock ? portraits[coach.user_id] : undefined
        return <article className="trainer-profile" key={coach.user_id}>
          <div className="trainer-portrait">
            {portrait ? <img src={`/images/trainers/${portrait.file}.webp`} alt="" width={portrait.width} height={portrait.height} loading="lazy" decoding="async" /> : <UserRound size={64} strokeWidth={1} aria-hidden="true" />}
            <span className="trainer-number" aria-hidden="true">0{index + 1}</span>
            {!compact && <p className="trainer-experience">{t('coaches.experience', { count: coach.experience_years })}</p>}
          </div>
          <Heading>{localized(coach, 'name', locale)}</Heading>
          <p className="trainer-specialization">{localized(coach, 'specialization', locale)}</p>
          {!compact && <>
            <p className="trainer-bio">{localized(coach, 'bio', locale)}</p>
            {localized(coach, 'education', locale) && <div className="trainer-education"><h3>{t('coaches.education')}</h3><p>{localized(coach, 'education', locale)}</p></div>}
            <Link className="underline inline-flex min-h-11 items-center mt-4" to={'/schedule?trainer=' + coach.user_id}>{t('coaches.schedule')} ↗</Link>
          </>}
        </article>
      })}
    </div>
    {isMock && showDemoNote && <p className="trainer-demo-note">{homeCopy[locale].coachesDemo}</p>}
  </>
}
