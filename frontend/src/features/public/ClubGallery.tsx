import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { facilityImages, homeCopy, type HomeLocale } from './home-content'

const rooms = ['gym', 'cardio', 'pool', 'changing'] as const

export function ClubGallery({ locale }: { locale: HomeLocale }) {
  const copy = homeCopy[locale]
  const track = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  function goTo(index: number) {
    const list = track.current
    const slide = list?.children[Math.max(0, Math.min(rooms.length - 1, index))] as HTMLElement | undefined
    if (!list || !slide) return
    list.scrollTo({ left: slide.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  function syncActive() {
    const list = track.current
    if (!list) return
    const slides = Array.from(list.children) as HTMLElement[]
    const nearest = slides.reduce((best, slide, index) => Math.abs(slide.offsetLeft - list.scrollLeft) < Math.abs(slides[best].offsetLeft - list.scrollLeft) ? index : best, 0)
    setActive(nearest)
  }

  function navigate(event: KeyboardEvent<HTMLUListElement>) {
    const index = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: rooms.length - 1 }[event.key]
    if (index === undefined) return
    event.preventDefault()
    goTo(index)
  }

  return <section className="fp-gallery fp-section" aria-labelledby="fp-gallery-heading" aria-roledescription={copy.galleryLabel}>
    <div className="fp-shell">
      <div className="fp-section-heading"><h2 id="fp-gallery-heading">{copy.gallery}</h2><p>{copy.galleryIntro}</p></div>
      <ul className="fp-gallery-track" ref={track} tabIndex={0} aria-label={copy.galleryLabel} aria-describedby="fp-gallery-help" onScroll={syncActive} onKeyDown={navigate}>
        {rooms.map((room, index) => <li key={room} className="fp-gallery-slide">
          <figure><img src={facilityImages[room]} alt={copy[`${room}Alt`]} width="1200" height="800" loading="lazy" decoding="async" /><figcaption><div><span className="fp-gallery-number" aria-hidden="true">0{index + 1}</span><h3>{copy[room]}</h3></div><p>{copy[`${room}Text`]}</p></figcaption></figure>
        </li>)}
      </ul>
      <div className="fp-gallery-bottom">
        <div><p id="fp-gallery-help">{copy.galleryHelp}</p><p className="fp-photo-note">{copy.photoNote}</p></div>
        <div className="fp-gallery-controls"><span className="fp-gallery-count" aria-live="polite" aria-atomic="true">0{active + 1} / 0{rooms.length}<span className="sr-only"> — {copy[rooms[active]]}</span></span><button type="button" aria-label={copy.previousPhoto} disabled={active === 0} onClick={() => goTo(active - 1)}><ArrowLeft size={20} aria-hidden="true" /></button><button type="button" aria-label={copy.nextPhoto} disabled={active === rooms.length - 1} onClick={() => goTo(active + 1)}><ArrowRight size={20} aria-hidden="true" /></button></div>
      </div>
    </div>
  </section>
}
