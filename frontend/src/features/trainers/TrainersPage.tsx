import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { api, isMock } from '@/api'
import { Empty, Loading, QueryError } from '@/components/feedback'
import { localized } from '@/lib/format'

export function TrainersPage() {
  const { t, i18n } = useTranslation()
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  return (
    <section className="container-shell pt-9 sm:pt-14">
      <div className="page-intro">
        <h1 className="page-title">{t('coaches.title')}</h1>
        <p>{t('coaches.subtitle')}</p>
      </div>
      {trainers.isPending ? <Loading /> : trainers.isError ? <QueryError retry={() => void trainers.refetch()} /> : !trainers.data.length ? <Empty /> : (
        <div className="grid gap-x-12 md:grid-cols-2">
          {trainers.data.map(coach => <article key={coach.user_id} className="border-t border-border py-8">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded bg-card text-accent-ink"><UserRound size={24} strokeWidth={1.3} /></span>
              <div className="min-w-0"><h2 className="text-2xl font-medium">{localized(coach, 'name', i18n.language)}</h2><p className="mt-2 text-xs">{t('coaches.experience', { count: coach.experience_years })}</p></div>
            </div>
            <p className="mt-6 text-sm font-medium">{localized(coach, 'specialization', i18n.language)}</p>
            <p className="mt-3 text-sm leading-7">{localized(coach, 'bio', i18n.language)}</p>
          </article>)}
        </div>
      )}
      {isMock && <p className="mt-6 border-t border-border pt-6 text-xs leading-6">{t('coaches.demoNote')}</p>}
    </section>
  )
}
