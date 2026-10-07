import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react'
import { ClubGallery, photoFadeDuration } from './ClubGallery'
import { homeCopy, type HomeLocale } from './home-content'

const rooms = ['gym', 'cardio', 'pool', 'changing'] as const

export function ClubSpaces({ locale }: { locale: HomeLocale }) {
  const copy = homeCopy[locale]
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const pointerFocus = useRef(false)
  const progress = useRef<HTMLSpanElement>(null)
  const animation = useRef<Animation | null>(null)
  const [selection, setSelection] = useState({ active: 0, revision: 0, poolView: 'inside' })
  const { active } = selection
  const [stopped, setStopped] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const running = !stopped && visible && !hidden && !reduced

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(node)
    const visibility = () => setHidden(document.hidden)
    const keyboard = () => { pointerFocus.current = false }
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => { setReduced(media.matches); if (media.matches) setStopped(true) }
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('keydown', keyboard, true)
    media.addEventListener('change', motion)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('keydown', keyboard, true)
      media.removeEventListener('change', motion)
    }
  }, [])

  // The browser animation is the single clock; completion advances the slide.
  // Pausing preserves currentTime without React updates on each frame.
  useEffect(() => {
    const node = progress.current
    if (!node) return
    const clock = node.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 8000, delay: reduced ? 0 : photoFadeDuration, fill: 'both' })
    clock.pause()
    clock.onfinish = () => setSelection(current => ({ ...current, active: (current.active + 1) % rooms.length, revision: current.revision + 1 }))
    animation.current = clock
    return () => { clock.onfinish = null; clock.cancel(); animation.current = null }
  }, [active, selection.revision, reduced])

  useEffect(() => {
    if (running) animation.current?.play()
    else animation.current?.pause()
  }, [running, active, selection.revision, reduced])

  function select(index: number) {
    setSelection(current => ({ ...current, active: index, revision: current.revision + 1 }))
  }
  function selectPool(view: string) {
    if (view === selection.poolView) return
    setSelection(current => ({ ...current, poolView: view, revision: current.revision + 1 }))
  }
  function navigate(event: KeyboardEvent) {
    const index = { ArrowLeft: (active + 3) % 4, ArrowRight: (active + 1) % 4, Home: 0, End: 3 }[event.key]
    if (index === undefined) return
    event.preventDefault()
    setStopped(true)
    select(index)
  }
  const room = rooms[active]

  return <section className="fp-shell fp-section fp-spaces" data-reveal id="club" tabIndex={-1} aria-labelledby="fp-spaces-heading"
    style={{ '--space-fade-duration': `${photoFadeDuration}ms` } as CSSProperties}>
    <div className="fp-section-heading"><h2 id="fp-spaces-heading">{copy.spaces}</h2></div>
    <div className="space-browser" role="region" aria-roledescription={copy.carousel} aria-labelledby={id + '-title'} onKeyDown={navigate}
      onPointerDownCapture={() => { pointerFocus.current = true }}
      onClickCapture={() => { pointerFocus.current = false }}
      onFocusCapture={() => {
        if (!pointerFocus.current) setStopped(true)
        pointerFocus.current = false
      }}>
      <div className="space-navigation">
        <h3 id={id + '-title'} className="space-current-title">{room === 'changing' ? copy.changingShort : copy[room]}</h3>
        <div className="space-arrows">
          <button className="space-arrow" type="button" aria-label={copy.previousPhoto} onClick={() => select((active + 3) % 4)}><ArrowLeft size={22} aria-hidden="true" /></button>
          <button className="space-arrow" type="button" aria-label={copy.nextPhoto} onClick={() => select((active + 1) % 4)}><ArrowRight size={22} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="space-timeline">
        <div className="space-track" aria-hidden="true"><span ref={progress} className="space-clock" /></div>
        <button className="space-autoplay" type="button" onClick={() => setStopped(value => !value)} disabled={reduced}
          aria-label={reduced ? copy.autoplayReduced : stopped ? copy.resumePhotos : copy.pausePhotos}
          title={reduced ? copy.autoplayReduced : stopped ? copy.resumePhotos : copy.pausePhotos}>
          {stopped || reduced ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        </button>
      </div>
    <div className="space-panel" ref={root}>
      <ClubGallery locale={locale} active={active} poolView={selection.poolView} revision={selection.revision} onChange={select} reduced={reduced} />
      <div className="space-copy" role="group" aria-labelledby={id + '-title'} tabIndex={0} aria-live={running ? 'off' : 'polite'}>
        <div className="space-copy-stack">
          {rooms.map((key, index) => <div key={key} className={'space-copy-slide' + (index === active ? ' is-active' : '')} aria-hidden={index !== active} inert={index !== active}>
            <div className="space-details"><p>{copy[`${key}Text`]}</p>
              {key === 'pool' && <div className="pool-views" role="group" aria-label={copy.poolViews}>
                {(['inside', 'outside'] as const).map(view => <button key={view} type="button" aria-pressed={selection.poolView === view} onClick={() => selectPool(view)}>{view === 'inside' ? copy.poolInside : copy.poolOutside}</button>)}
              </div>}
            </div>
            <Link className="fp-inline-link" to="#memberships">{key === 'changing' ? copy.visitOptions : copy[`${key}Action`]}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>)}
        </div>
      </div>
    </div>
    </div>
  </section>
}
