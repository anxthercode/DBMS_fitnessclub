import { useId, useLayoutEffect, useRef, useState } from 'react'
import { facilityImages, homeCopy, type HomeLocale } from './home-content'

export const photoFadeDuration = 1100
const photos = [
  { key: 'gym', room: 0, view: '', alt: 'gymAlt' },
  { key: 'cardio', room: 1, view: '', alt: 'cardioAlt' },
  { key: 'pool', room: 2, view: 'inside', alt: 'poolAlt' },
  { key: 'poolOutside', room: 2, view: 'outside', alt: 'poolOutsideAlt' },
  { key: 'changing', room: 3, view: '', alt: 'changingAlt' },
] as const
type Photo = typeof photos[number]
type Layer = { revision: number; photo: Photo; ready: boolean; settled: boolean }

export function ClubGallery({ locale, active, poolView, revision, onChange, reduced }: {
  locale: HomeLocale; active: number; poolView: string; revision: number
  onChange: (index: number) => void; reduced: boolean
}) {
  const copy = homeCopy[locale]
  const id = useId()
  const touch = useRef<{ x: number; y: number } | null>(null)
  const photo = photos.find(item => item.room === active && (!item.view || item.view === poolView))!
  const [layers, setLayers] = useState<Layer[]>(() => [{ revision, photo, ready: false, settled: revision === 0 || reduced }])

  // Keep the visible composition underneath incoming photos, including when
  // another selection interrupts a dissolve. Prune only after the latest fade.
  useLayoutEffect(() => {
    setLayers(current => {
      const latest = current[current.length - 1]
      if (latest.revision === revision && latest.photo.key === photo.key) return reduced ? [{ ...latest, settled: true }] : current
      const next = { revision, photo, ready: false, settled: reduced }
      return reduced ? [next] : [...current, next]
    })
  }, [revision, photo, reduced])

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
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) onChange((active + (dx < 0 ? 1 : 3)) % 4)
      }}>
      {photos.map(item => <img key={item.key} className="space-preload" src={facilityImages[item.key].src} alt="" aria-hidden="true"
        width={facilityImages[item.key].width} height={facilityImages[item.key].height} loading="lazy" decoding="async" />)}
      {layers.map((layer, index) => {
        const source = facilityImages[layer.photo.key]
        const latest = index === layers.length - 1
        return <img key={layer.revision} src={source.src} alt={latest ? copy[layer.photo.alt] : ''} data-view={layer.photo.view}
          aria-hidden={!latest} className={'space-layer' + (latest ? ' is-active' : '') + (layer.ready ? ' is-loaded' : '') + (!layer.settled && layer.ready ? ' is-revealing' : '')}
          width={source.width} height={source.height} loading={layer.revision === 0 ? 'lazy' : 'eager'} decoding="async"
          onLoad={async event => {
            // Start the dissolve only when pixels are decoded, so rapid clicks
            // cannot discard the visible backing before the next photo is ready.
            const image = event.currentTarget
            try { await image.decode() } catch { return }
            setLayers(current => current.map(item => item.revision === layer.revision ? { ...item, ready: true } : item))
          }}
          onAnimationEnd={() => setLayers(current => {
            const settled = current.map(item => item.revision === layer.revision ? { ...item, settled: true } : item)
            return settled[settled.length - 1].revision === layer.revision ? [settled[settled.length - 1]] : settled
          })} />
      })}
    </div>
    <p className="sr-only" id={id}>{copy.galleryHelp}</p>
  </div>
}
