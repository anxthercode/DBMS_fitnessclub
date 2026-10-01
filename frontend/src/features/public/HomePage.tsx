import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowUpRight, Minus, Plus } from 'lucide-react'
import { api } from '@/api'
import { localized } from '@/lib/format'
import { heroImage, homeCopy } from './home-content'
import { GuestVisit } from './GuestVisit'
import { PlanCards } from '@/features/memberships/PlanCards'
import { TrainerProfiles } from '@/features/trainers/TrainerProfiles'
import { TrainingDirections } from './TrainingDirections'
import { ClubGallery } from './ClubGallery'
import './home.css'

export function HomePage() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const copy = homeCopy[locale]
  const club = useQuery({ queryKey: ['club'], queryFn: api.club })
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.plans })
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  return (
    <div className="club-content">
        <section className="fp-shell fp-hero" aria-labelledby="fp-title">
          <div className="fp-hero-layout">
            <div className="fp-hero-copy">
              <p className="fp-hero-brand">{copy.brand}</p>
              <h1 id="fp-title">{copy.title}</h1>
              <p className="fp-lead">{copy.intro}</p>
              <div className="fp-hero-actions"><Link className="fp-primary" to="#guest-visit">{copy.heroAction}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link className="fp-inline-link" to="#memberships">{copy.choose}<ArrowRight size={17} aria-hidden="true" /></Link></div>
              <p className="fp-hero-terms">{copy.heroTerms}</p>
            </div>
            <figure className="fp-hero-photo"><img src={heroImage} width="1536" height="1024" fetchPriority="high" alt={copy.heroAlt} /><figcaption><span>{copy.heroCaption}</span><span>{copy.photoNote}</span></figcaption></figure>
          </div>
          <div className="fp-hero-meta"><p>{club.data ? localized(club.data, 'location', locale) : (locale === 'ru' ? 'Минск, Беларусь' : 'Minsk, Belarus')}</p><p>{copy.daily}<span aria-hidden="true"> / </span>{club.data?.hours || '07:00–23:00'}</p><Link to="#club">{copy.directions}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </section>

        <TrainingDirections locale={locale} />
        <ClubGallery locale={locale} />

        <section className="fp-shell fp-section fp-coaches" aria-labelledby="fp-coaches-heading">
          <div className="fp-section-heading"><h2 id="fp-coaches-heading">{copy.coaches}</h2><div><p>{copy.coachesIntro}</p><Link className="fp-inline-link" to="/trainers">{copy.allCoaches}<ArrowUpRight size={17} aria-hidden="true" /></Link></div></div>
          {trainers.isPending ? <p role="status">{copy.loading}</p> : trainers.isError ? <div role="alert"><p>{copy.coachesError}</p><button className="fp-inline-link" type="button" onClick={() => void trainers.refetch()}>{copy.retry}</button></div> : !trainers.data.length ? <p>{copy.coachesEmpty}</p> : <TrainerProfiles trainers={trainers.data.slice(0, 3)} headingLevel="h3" />}
        </section>

        <section className="fp-memberships" id="memberships" tabIndex={-1} aria-labelledby="fp-memberships-heading">
          <div className="fp-shell">
            <div className="fp-section-heading"><h2 id="fp-memberships-heading">{copy.plans}</h2><p>{copy.plansIntro}</p></div>
            <GuestVisit locale={locale} />
            {plans.isPending ? <p role="status">{copy.loading}</p> : plans.isError ? <div role="alert"><p>{copy.error}</p><button type="button" className="fp-inline-link" onClick={() => void plans.refetch()}>{copy.retry}</button></div> : !plans.data.some(plan => plan.is_active) ? <p>{copy.noPlans}</p> : <PlanCards plans={plans.data.filter(plan => plan.is_active)} headingLevel="h3" />}
            <div className="fp-plans-bottom"><div><p>{copy.trainingNote}</p><p>{copy.demoNote}</p></div><Link className="fp-inline-link" to="/plans">{copy.allPlans}<ArrowRight size={17} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className="fp-shell fp-section fp-visiting" aria-labelledby="fp-visiting-heading">
          <div><h2 id="fp-visiting-heading">{copy.visiting}</h2><p className="fp-visiting-intro">{copy.visitingIntro}</p></div>
          <div className="fp-faqs">{copy.faqs.map((faq, index) => <details key={index}><summary>{faq.question}<Plus className="fp-faq-plus" size={17} aria-hidden="true" /><Minus className="fp-faq-minus" size={17} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </section>

        <section className="fp-shell fp-contacts" id="contacts" tabIndex={-1} aria-labelledby="fp-contacts-heading">
          <h2 id="fp-contacts-heading">{copy.contactTitle}</h2>
          <div className="fp-contact-grid">
            <dl><div><dt>{copy.locationLabel}</dt><dd>{club.data ? localized(club.data, 'location', locale) : (locale === 'ru' ? 'Минск, Беларусь' : 'Minsk, Belarus')}</dd></div><div><dt>{copy.hoursLabel}</dt><dd>{copy.daily}, {club.data?.hours || '07:00–23:00'}</dd></div></dl>
            <p>{copy.detailsNote}</p>
          </div>
        </section>
    </div>
  )
}
