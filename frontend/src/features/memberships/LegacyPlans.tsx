import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { Empty, Loading, QueryError } from '@/components/feedback'
import { AnimatedDisclosure } from '@/components/ui/disclosure'
import { PlanCards } from './PlanCards'
import { offerCopy } from './offer-copy'

export function LegacyPlans() {
  const { i18n } = useTranslation()
  const copy = offerCopy[i18n.language === 'en' ? 'en' : 'ru']
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.plans })
  const active = plans.data?.filter(plan => plan.is_active)
  return <div className="legacy-plans club-content">
    <AnimatedDisclosure title={copy.legacy}>
      <p className="legacy-note">{copy.legacyNote}</p>
      {plans.isPending ? <Loading /> : plans.isError ? <QueryError retry={() => void plans.refetch()} /> : !active?.length ? <Empty /> : <PlanCards plans={active} />}
    </AnimatedDisclosure>
  </div>
}
