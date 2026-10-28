import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import type { Trainer } from '@/api/types'
import { localized } from '@/lib/format'
import './trainers.css'

// Explicit keys belong to fictional coursework profiles, never inferred from user IDs.
const portraits: Record<string, { file: string; width: number; height: number }> = {
  'trainer-01': { file: 'trainer-01', width: 843, height: 1264 },
  'trainer-03': { file: 'trainer-03', width: 1408, height: 768 },
  'trainer-02': { file: 'trainer-02', width: 1408, height: 768 },
}

export function TrainerProfiles({ trainers, headingLevel = 'h2', compact = false }: { trainers: Trainer[]; headingLevel?: 'h2' | 'h3'; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const Heading = headingLevel
  return <>
    <div className={'trainer-grid' + (compact ? ' trainer-grid-compact' : '')}>
      {trainers.map(coach => {
        const portrait = coach.portrait_key && Object.hasOwn(portraits, coach.portrait_key) ? portraits[coach.portrait_key] : undefined
        return <article className="trainer-profile" key={coach.user_id}>
          <div className="trainer-portrait">
            {portrait ? <img src={`/images/trainers/${portrait.file}.webp`} alt="" width={portrait.width} height={portrait.height} loading="lazy" decoding="async" /> : <UserRound size={64} strokeWidth={1} aria-hidden="true" />}
            {!compact && <p className="trainer-experience">{t('coaches.experience', { count: coach.experience_years })}</p>}
          </div>
          <Heading>{localized(coach, 'name', locale)}</Heading>
          <p className="trainer-specialization">{localized(coach, 'specialization', locale)}</p>
          {!compact && <>
            <p className="trainer-bio">{localized(coach, 'bio', locale)}</p>
            {localized(coach, 'education', locale) && <div className="trainer-education"><h3>{t('coaches.education')}</h3><p>{localized(coach, 'education', locale)}</p></div>}
          </>}
          <Link className="trainer-schedule" to={'/schedule?trainer=' + coach.user_id}>{t('coaches.schedule')} <span aria-hidden="true">↗</span></Link>
        </article>
      })}
    </div>
  </>
}
