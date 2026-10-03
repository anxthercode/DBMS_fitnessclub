import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { api } from '@/api'
import { localized } from '@/lib/format'
import { heroImage, homeCopy } from './home-content'
import { GuestVisit } from './GuestVisit'
import { OfferPreview } from '@/features/memberships/OfferPreview'
import { TrainerProfiles } from '@/features/trainers/TrainerProfiles'
import { ClubSpaces } from './ClubSpaces'
import { AnimatedDisclosure } from '@/components/ui/disclosure'
import { useSectionReveal } from './use-section-reveal'
import './home.css'

export function HomePage() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const copy = homeCopy[locale]
  const club = useQuery({ queryKey: ['club'], queryFn: api.club })
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const root = useSectionReveal()
  return (
    <div className="club-content fp-home" ref={root}>
        <section className="fp-shell fp-hero" aria-labelledby="fp-title">
          <div className="fp-hero-layout">
            <div className="fp-hero-copy">
              <p className="fp-hero-brand">{copy.brand}</p>
              <h1 id="fp-title">{copy.title}</h1>
              <p className="fp-lead">{copy.intro}</p>
              <div className="fp-hero-actions"><Link className="fp-primary" to="#guest-visit">{copy.heroAction}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link className="fp-inline-link" to="#memberships">{copy.choose}<ArrowRight size={17} aria-hidden="true" /></Link></div>
              <p className="fp-hero-terms">{copy.heroTerms}</p>
            </div>
            <figure className="fp-hero-photo"><div className="fp-photo-frame"><img src={heroImage} width="1920" height="1281" fetchPriority="high" alt={copy.heroAlt} /></div><figcaption>{copy.heroCaption}</figcaption></figure>
          </div>
          <div className="fp-hero-meta"><p>{club.data ? localized(club.data, 'location', locale) : (locale === 'ru' ? 'Минск, Беларусь' : 'Minsk, Belarus')}</p><p>{copy.daily}<span aria-hidden="true"> / </span>{club.data?.hours || '07:00–23:00'}</p><Link to="#club">{copy.directions}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </section>

        <ClubSpaces locale={locale} />

        <section className="fp-shell fp-section fp-coaches" data-reveal aria-labelledby="fp-coaches-heading">
          <div className="fp-section-heading"><h2 id="fp-coaches-heading">{copy.coaches}</h2><div><p>{copy.coachesIntro}</p><Link className="fp-inline-link" to="/trainers">{copy.allCoaches}<ArrowUpRight size={17} aria-hidden="true" /></Link></div></div>
          {trainers.isPending ? <p role="status">{copy.loading}</p> : trainers.isError ? <div role="alert"><p>{copy.coachesError}</p><button className="fp-inline-link" type="button" onClick={() => void trainers.refetch()}>{copy.retry}</button></div> : !trainers.data.length ? <p>{copy.coachesEmpty}</p> : <TrainerProfiles trainers={trainers.data.slice(0, 3)} headingLevel="h3" showDemoNote={false} />}
        </section>

        <section className="fp-memberships" data-reveal id="memberships" tabIndex={-1} aria-labelledby="fp-memberships-heading">
          <div className="fp-shell">
            <div className="fp-section-heading"><h2 id="fp-memberships-heading">{copy.plans}</h2><p>{copy.plansIntro}</p></div>
            <OfferPreview />
            <div className="fp-plans-bottom"><Link className="fp-inline-link" to="/plans">{copy.allPlans}<ArrowRight size={17} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <div className="fp-shell fp-guest-section" data-reveal><GuestVisit locale={locale} /></div>

        <section className="fp-shell fp-section fp-visiting" data-reveal aria-labelledby="fp-visiting-heading">
          <div><h2 id="fp-visiting-heading">{copy.visiting}</h2><p className="fp-visiting-intro">{copy.visitingIntro}</p></div>
          <div className="fp-faqs">{copy.faqs.map((faq, index) => <AnimatedDisclosure key={index} title={faq.question}><p>{faq.answer}</p></AnimatedDisclosure>)}</div>
        </section>

        <section className="fp-shell fp-contacts" data-reveal id="contacts" tabIndex={-1} aria-labelledby="fp-contacts-heading">
          <h2 id="fp-contacts-heading">{copy.contactTitle}</h2>
          <div className="fp-contact-grid">
            <dl><div><dt>{copy.locationLabel}</dt><dd>{club.data ? localized(club.data, 'location', locale) : (locale === 'ru' ? 'Минск, Беларусь' : 'Minsk, Belarus')}</dd></div><div><dt>{copy.hoursLabel}</dt><dd>{copy.daily}, {club.data?.hours || '07:00–23:00'}</dd></div></dl>
            <p>{copy.detailsNote}</p>
          </div>
          <p className="fp-concept-note">{copy.photoNote}</p>
        </section>
    </div>
  )
}
