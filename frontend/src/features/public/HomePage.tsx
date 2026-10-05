import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { api } from '@/api'
import { localized } from '@/lib/format'
import { homeCopy } from './home-content'
import { ClubHero } from './ClubHero'
import { GuestVisit } from './GuestVisit'
import { OfferPreview } from '@/features/memberships/OfferPreview'
import { TrainerProfiles } from '@/features/trainers/TrainerProfiles'
import { ClubSpaces } from './ClubSpaces'
import { AnimatedDisclosure } from '@/components/ui/disclosure'
import { useSectionReveal } from './use-section-reveal'
import './home.css'
import './northside.css'

export function HomePage() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const copy = homeCopy[locale]
  const club = useQuery({ queryKey: ['club'], queryFn: api.club })
  const trainers = useQuery({ queryKey: ['trainers'], queryFn: api.trainers })
  const root = useSectionReveal()
  return (
    <div className="club-content fp-home" ref={root}>
        <ClubHero locale={locale} location={club.data ? localized(club.data, 'location', locale) : (locale === 'ru' ? 'Минск, Беларусь' : 'Minsk, Belarus')} hours={club.data?.hours || '07:00–23:00'} />

        <ClubSpaces locale={locale} />

        <div className="fp-shell fp-guest-section" data-reveal><GuestVisit locale={locale} /></div>

        <section className="fp-memberships" data-reveal id="memberships" tabIndex={-1} aria-labelledby="fp-memberships-heading">
          <div className="fp-shell">
            <div className="fp-section-heading"><div><p className="section-index">02 / {copy.accessLabel}</p><h2 id="fp-memberships-heading">{copy.plans}</h2></div><p>{copy.plansIntro}</p></div>
            <OfferPreview />
            <div className="fp-plans-bottom"><Link className="fp-inline-link" to="/plans">{copy.allPlans}<ArrowRight size={17} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className="fp-shell fp-section fp-coaches" data-reveal aria-labelledby="fp-coaches-heading">
          <div className="fp-section-heading"><div><p className="section-index">03 / {copy.teamLabel}</p><h2 id="fp-coaches-heading">{copy.coaches}</h2></div><Link className="fp-inline-link" to="/trainers">{copy.allCoaches}<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
          {trainers.isPending ? <p role="status">{copy.loading}</p> : trainers.isError ? <div role="alert"><p>{copy.coachesError}</p><button className="fp-inline-link" type="button" onClick={() => void trainers.refetch()}>{copy.retry}</button></div> : !trainers.data.length ? <p>{copy.coachesEmpty}</p> : <TrainerProfiles trainers={trainers.data.slice(0, 3)} headingLevel="h3" />}
        </section>

        <section className="fp-shell fp-section fp-visiting" data-reveal aria-labelledby="fp-visiting-heading">
          <div><p className="section-index">04 / FAQ</p><h2 id="fp-visiting-heading">{copy.visiting}</h2></div>
          <div className="fp-faqs">{copy.faqs.map((faq, index) => <AnimatedDisclosure key={index} title={faq.question}><p>{faq.answer}</p></AnimatedDisclosure>)}</div>
        </section>

    </div>
  )
}
