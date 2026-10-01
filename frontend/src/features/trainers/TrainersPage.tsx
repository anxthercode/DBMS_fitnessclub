import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { Empty, Loading, QueryError } from '@/components/feedback'
import { TrainerProfiles } from './TrainerProfiles'

export function TrainersPage() {
  const { t } = useTranslation()
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  return (
    <section className="container-shell pt-9 sm:pt-14">
      <div className="page-intro">
        <h1 className="page-title">{t('coaches.title')}</h1>
        <p>{t('coaches.subtitle')}</p>
      </div>
      {trainers.isPending ? <Loading /> : trainers.isError ? <QueryError retry={() => void trainers.refetch()} /> : !trainers.data.length ? <Empty /> : <TrainerProfiles trainers={trainers.data} />}
    </section>
  )
}
