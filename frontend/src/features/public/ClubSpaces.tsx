import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { ClubGallery } from './ClubGallery'
import { homeCopy, type HomeLocale } from './home-content'

const rooms = ['gym', 'cardio', 'pool', 'changing'] as const

export function ClubSpaces({ locale }: { locale: HomeLocale }) {
  const copy = homeCopy[locale]
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const [active, setActive] = useState(0)
  const room = rooms[active]
  function navigate(event: KeyboardEvent) {
    const index = { ArrowLeft: (active + 3) % 4, ArrowRight: (active + 1) % 4, Home: 0, End: 3 }[event.key]
    if (index === undefined) return
    event.preventDefault()
    setActive(index)
    tabs.current[index]?.focus()
  }
  return <section className="fp-shell fp-section fp-spaces" data-reveal id="club" tabIndex={-1} aria-labelledby="fp-spaces-heading">
    <div className="fp-section-heading"><h2 id="fp-spaces-heading">{copy.spaces}</h2><p>{copy.spacesIntro}</p></div>
    <div className="space-tabs" role="tablist" aria-label={copy.spaces} onKeyDown={navigate}>
      {rooms.map((key, index) => <button className="choice-pill" key={key} ref={node => { tabs.current[index] = node }} type="button" role="tab"
        id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={active === index} tabIndex={active === index ? 0 : -1}
        onClick={() => setActive(index)}>{copy[key]}</button>)}
    </div>
    <div className="space-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
      <ClubGallery locale={locale} active={active} onChange={setActive} />
      <div className="space-copy">
        <p className="eyebrow">{copy[`${room}Detail`]}</p>
        <h3>{copy[room]}</h3><p>{copy[`${room}Text`]}</p>
        <p className="space-access">{copy[`${room}Access`]}</p>
        <Link className="fp-inline-link" to="#memberships">{room === 'changing' ? copy.visitOptions : copy[`${room}Action`]}<ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
  </section>
}
