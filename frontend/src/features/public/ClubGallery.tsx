import { useId, useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { facilityImages, homeCopy, type HomeLocale } from './home-content'

const rooms = ['gym', 'cardio', 'pool', 'changing'] as const

// The photo controls and tabs share one selection; there is no second carousel.
export function ClubGallery({ locale, active, onChange }: { locale: HomeLocale; active: number; onChange: (index: number) => void }) {
  const copy = homeCopy[locale]
  const id = useId()
  const touch = useRef<{ x: number; y: number } | null>(null)
  function move(delta: number) { onChange((active + delta + rooms.length) % rooms.length) }
  return <div className="space-gallery">
    <div className="space-photo fp-photo-frame" aria-describedby={id}
      onTouchStart={event => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY } }}
      onTouchCancel={() => { touch.current = null }}
      onTouchEnd={event => {
        const start = touch.current
        touch.current = null
        if (!start) return
        const end = event.changedTouches[0]
        const dx = end.clientX - start.x
        const dy = end.clientY - start.y
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
      }}>
      {rooms.map((room, index) => <img key={room} src={facilityImages[room].src} alt={active === index ? copy[`${room}Alt`] : ''}
        aria-hidden={active !== index} className={active === index ? 'is-active' : ''}
        width={facilityImages[room].width} height={facilityImages[room].height} loading="lazy" decoding="async" />)}
      <button className="space-arrow space-arrow-prev" type="button" aria-label={copy.previousPhoto} onClick={() => move(-1)}><ArrowLeft size={28} aria-hidden="true" /></button>
      <button className="space-arrow space-arrow-next" type="button" aria-label={copy.nextPhoto} onClick={() => move(1)}><ArrowRight size={28} aria-hidden="true" /></button>
    </div>
    <p className="sr-only" id={id}>{copy.galleryHelp}</p>
    <div className="fp-gallery-controls">
      <span className="fp-gallery-count" aria-live="polite" aria-atomic="true">0{active + 1} / 04<span className="sr-only"> — {copy[rooms[active]]}</span></span>
      <span className="space-progress" aria-hidden="true">{rooms.map((room, index) => <span key={room} className={index === active ? 'is-active' : ''} />)}</span>
    </div>
  </div>
}
