import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { Empty, Loading, QueryError } from '@/components/feedback'
import { PlanCards } from './PlanCards'

export function PlansPage() {
  const { t } = useTranslation()
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.plans })
  const activePlans = plans.data?.filter(plan => plan.is_active)
  return (
    <section className="container-shell pt-9 sm:pt-14">
      <div className="page-intro">
        <h1 className="page-title">{t('plans.title')}</h1>
        <p>{t('plans.subtitle')}</p>
      </div>
      {plans.isPending ? <Loading /> : plans.isError ? <QueryError retry={() => void plans.refetch()} /> : !activePlans?.length ? <Empty /> : <PlanCards plans={activePlans} />}
      <div className="mt-8 grid gap-5 border-t border-border pt-7 md:grid-cols-2">
        <div><h2 className="text-lg font-medium">{t('plans.conditionsTitle')}</h2><p className="mt-3 text-sm leading-7">{t('plans.conditions')}</p></div>
        <p className="text-xs leading-6">{t('plans.publicNote')}</p>
      </div>
    </section>
  )
}
