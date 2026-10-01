import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowRight, ArrowUpRight, Minus, Plus } from 'lucide-react'
import { api } from '@/api'
import { localized } from '@/lib/format'
import { facilityImages, homeCopy, type FacilityId } from './home-content'
import { GuestVisit } from './GuestVisit'
import { PlanCards } from '@/features/memberships/PlanCards'
import './home.css'

export function HomePage() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const copy = homeCopy[locale]
  const club = useQuery({ queryKey: ['club'], queryFn: api.club })
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.plans })
  const [facility, setFacility] = useState<FacilityId>('gym')
  const [facilityOpen, setFacilityOpen] = useState(true)
  const facilities = (Object.keys(facilityImages) as FacilityId[]).map(id => ({
    id, name: copy[id], description: copy[`${id}Text`], detail: copy[`${id}Detail`], alt: copy[`${id}Alt`], image: facilityImages[id],
  }))
  const selected = facilities.find(item => item.id === facility)!
  return (
    <div className="club-content">
        <section className="fp-shell fp-intro" aria-labelledby="fp-title">
          <div className="fp-intro-top">
            <div><h1 id="fp-title">{copy.title}</h1><p className="fp-lead">{copy.intro}</p></div>
            <div className="fp-intro-meta">
              <p>{club.data ? localized(club.data, 'location', locale) : (locale === 'ru' ? 'Минск, Беларусь' : 'Minsk, Belarus')}</p>
              <p>{copy.daily} <span className="fp-meta-dot" aria-hidden="true">·</span> {club.data?.hours || '07:00–23:00'}</p>
              <Link className="fp-primary" to="#memberships">{copy.choose}<ArrowDown size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          <figure className="fp-panorama">
            <img src={facilityImages.pool} width="1600" height="1000" fetchPriority="high" alt={copy.heroAlt} />
            <figcaption><span>{copy.heroCaption}</span><span>{copy.photoNote}</span></figcaption>
          </figure>
        </section>

        <section className="fp-shell fp-section fp-facilities" id="club" tabIndex={-1} aria-labelledby="fp-facilities-heading">
          <div className="fp-section-heading"><h2 id="fp-facilities-heading">{copy.facilities}</h2><p>{copy.facilitiesIntro}</p></div>
          <div className="fp-facility-layout">
            <div className="fp-facility-list">
              {facilities.map(item => {
                const active = item.id === facility && facilityOpen
                return <div key={item.id} className={'fp-facility-item' + (active ? ' is-open' : '')}>
                  <h3><button type="button" id={`facility-button-${item.id}`} aria-expanded={active} aria-controls={`facility-panel-${item.id}`} onClick={() => { setFacility(item.id); setFacilityOpen(!active) }}><span>{item.name}</span>{active ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</button></h3>
                  <div id={`facility-panel-${item.id}`} role="region" aria-labelledby={`facility-button-${item.id}`} hidden={!active}>
                    <p>{item.description}</p>
                    {item.id === 'gym' && <Link className="fp-inline-link" to="/trainers">{copy.teamLink}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
                    <figure className="fp-facility-mobile"><img src={item.image} alt={item.alt} width="900" height="640" loading="lazy" /><figcaption>{item.detail}</figcaption></figure>
                  </div>
                </div>
              })}
            </div>
            <figure className="fp-facility-desktop" aria-live="polite" aria-atomic="true"><img key={selected.image} src={selected.image} alt={selected.alt} width="900" height="640" loading="lazy" /><figcaption><span>{selected.name}</span><span>{selected.detail}</span></figcaption></figure>
          </div>
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
