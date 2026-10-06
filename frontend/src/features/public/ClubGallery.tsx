import { useId, useRef, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import { facilityImages, homeCopy, type HomeLocale } from './home-content'

const rooms = ['gym', 'cardio', 'pool', 'changing'] as const
const photos = [
  { key: 'gym', room: 0, view: '', alt: 'gymAlt' },
  { key: 'cardio', room: 1, view: '', alt: 'cardioAlt' },
  { key: 'pool', room: 2, view: 'inside', alt: 'poolAlt' },
  { key: 'poolOutside', room: 2, view: 'outside', alt: 'poolOutsideAlt' },
  { key: 'changing', room: 3, view: '', alt: 'changingAlt' },
] as const

// The photo controls and tabs share one selection; there is no second carousel.
export function ClubGallery({ locale, active, previous, poolView, previousPoolView, onChange, navigation, progress, paused, stopped, reduced, onToggle }: {
  locale: HomeLocale; active: number; onChange: (index: number) => void; navigation: ReactNode
  previous: number; progress: ReactNode; paused: boolean; stopped: boolean; reduced: boolean; onToggle: () => void
  poolView: string; previousPoolView: string
}) {
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
      {photos.map(photo => {
        const shown = active === photo.room && (!photo.view || poolView === photo.view)
        const wasShown = previous === photo.room && (!photo.view || previousPoolView === photo.view)
        const source = facilityImages[photo.key]
        return <img key={photo.key} src={source.src} alt={shown ? copy[photo.alt] : ''} data-view={photo.view}
          aria-hidden={!shown} className={shown ? 'is-active' : wasShown ? 'is-previous' : ''}
          width={source.width} height={source.height} loading="lazy" decoding="async" />
      })}
      <button className="space-arrow space-arrow-prev" type="button" aria-label={copy.previousPhoto} onClick={() => move(-1)}><ArrowLeft size={28} aria-hidden="true" /></button>
      <button className="space-arrow space-arrow-next" type="button" aria-label={copy.nextPhoto} onClick={() => move(1)}><ArrowRight size={28} aria-hidden="true" /></button>
      <button className="space-autoplay" type="button" onClick={onToggle} disabled={reduced}
        aria-label={reduced ? copy.autoplayReduced : stopped ? copy.resumePhotos : copy.pausePhotos}
        title={reduced ? copy.autoplayReduced : stopped ? copy.resumePhotos : copy.pausePhotos}>
        {stopped ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
      {paused && <span className="space-pause-label">{copy.photosPaused}</span>}
      {progress}
    </div>
    <p className="sr-only" id={id}>{copy.galleryHelp}</p>
    {navigation}
  </div>
}
