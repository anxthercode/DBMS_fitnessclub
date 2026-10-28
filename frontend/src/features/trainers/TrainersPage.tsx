import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { Empty, Loading, QueryError } from '@/components/feedback'
import { TrainerProfiles } from './TrainerProfiles'
import { useState } from 'react'

export function TrainersPage() {
  const { t } = useTranslation()
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const [zone, setZone] = useState<'all' | 'gym' | 'pool'>('all')
  const visible = trainers.data?.filter(coach => zone === 'all' || coach.zones === zone || coach.zones === 'both') || []
  return (
    <section className="container-shell page-section">
      <div className="page-intro">
        <h1 className="page-title">{t('coaches.title')}</h1>
        <p>{t('coaches.subtitle')}</p>
      </div>
      {trainers.isPending ? <Loading /> : trainers.isError ? <QueryError retry={() => void trainers.refetch()} /> : !trainers.data.length ? <Empty title={t('coaches.empty')} /> : <>
        <div className="trainer-filters" role="group" aria-label={t('coaches.filter')}>
          {(['all', 'gym', 'pool'] as const).map(value => <button key={value} type="button" aria-pressed={zone === value} onClick={() => setZone(value)}>{t('coaches.' + value)}</button>)}
        </div>
        {visible.length ? <TrainerProfiles trainers={visible} /> : <Empty title={t('coaches.noMatches')} />}
      </>}
    </section>
  )
}
