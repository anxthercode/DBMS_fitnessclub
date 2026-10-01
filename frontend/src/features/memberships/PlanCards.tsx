import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import type { Plan } from '@/api/types'
import { localized, money } from '@/lib/format'
import { homeCopy } from '@/features/public/home-content'
import '@/features/public/home.css'

export function PlanCards({ plans, headingLevel = 'h2' }: { plans: Plan[]; headingLevel?: 'h2' | 'h3' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const copy = homeCopy[locale]
  const Heading = headingLevel
  return <div className="club-content fp-plan-grid">
    {plans.map(plan => <article className="fp-plan-card" key={plan.id} aria-labelledby={'plan-' + plan.id}>
      <div><Heading id={'plan-' + plan.id}>{copy[`month${plan.duration_months}`]}</Heading><p className="fp-plan-name">{localized(plan, 'name', locale)}</p></div>
      <p className="fp-plan-price"><span>{money(plan.price_byn, locale)}</span><small>{copy.price}</small></p>
      <div className="fp-plan-format"><p className="fp-plan-label">{copy.training}</p><p>{plan.allows_individual && plan.allows_group ? copy.individual : plan.allows_group ? copy.group : plan.allows_individual ? copy.individualOnly : copy.independentOnly}</p></div>
      <Link className="fp-plan-select" to={'/register?plan=' + encodeURIComponent(plan.id)}
        aria-label={headingLevel === 'h3' ? `${copy.selectPlan}: ${copy[`month${plan.duration_months}`]}` : t('plans.chooseNamed', { name: localized(plan, 'name', locale) })}>
        {copy.selectPlan}<ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </article>)}
  </div>
}
