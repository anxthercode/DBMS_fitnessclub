import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { ClubGallery } from './ClubGallery'
import { homeCopy, type HomeLocale } from './home-content'

const rooms = ['gym', 'cardio', 'pool', 'changing'] as const

export function ClubSpaces({ locale }: { locale: HomeLocale }) {
  const copy = homeCopy[locale]
  const id = useId()
  const root = useRef<HTMLElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const progress = useRef<(HTMLSpanElement | null)[]>([])
  const animation = useRef<Animation | null>(null)
  const [selection, setSelection] = useState({ active: 0, revision: 0 })
  const { active } = selection
  const [stopped, setStopped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const running = !stopped && !hovered && visible && !hidden && !reduced
  const room = rooms[active]

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(node)
    const visibility = () => setHidden(document.hidden)
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => { setReduced(media.matches); if (media.matches) setStopped(true) }
    document.addEventListener('visibilitychange', visibility)
    media.addEventListener('change', motion)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      media.removeEventListener('change', motion)
    }
  }, [])

  // The browser animation is the single clock; completion advances the slide.
  // Pausing preserves currentTime without React updates on each frame.
  useEffect(() => {
    const node = progress.current[active]
    if (!node) return
    const clock = node.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 8000, fill: 'forwards' })
    clock.pause()
    clock.onfinish = () => setSelection(current => ({ active: (current.active + 1) % rooms.length, revision: current.revision + 1 }))
    animation.current = clock
    return () => { clock.onfinish = null; clock.cancel(); animation.current = null }
  }, [active, selection.revision])

  useEffect(() => {
    if (running) animation.current?.play()
    else animation.current?.pause()
  }, [running, active, selection.revision])

  function select(index: number) {
    setStopped(true)
    setSelection(current => ({ active: index, revision: current.revision + 1 }))
  }
  function navigate(event: KeyboardEvent) {
    const index = { ArrowLeft: (active + 3) % 4, ArrowRight: (active + 1) % 4, Home: 0, End: 3 }[event.key]
    if (index === undefined) return
    event.preventDefault()
    select(index)
    tabs.current[index]?.focus()
  }
  const navigation = <div className="space-tabs" role="tablist" aria-label={copy.spaces} onKeyDown={navigate}>
    {rooms.map((key, index) => <button className="space-tab" key={key} ref={node => { tabs.current[index] = node }} type="button" role="tab"
      id={id + '-tab-' + index} aria-controls={id + '-panel'} aria-selected={active === index} tabIndex={active === index ? 0 : -1}
      onClick={() => select(index)}>
      <span>{key === 'changing' ? copy.changingShort : copy[key]}</span>
      <span className="space-track" aria-hidden="true"><span ref={node => { progress.current[index] = node }} /></span>
    </button>)}
  </div>

  return <section ref={root} className="fp-shell fp-section fp-spaces" data-reveal id="club" tabIndex={-1} aria-labelledby="fp-spaces-heading"
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
    onPointerLeave={() => setHovered(false)}
    onFocusCapture={event => {
      if (!(event.target instanceof Element) || !event.target.closest('.space-autoplay') || event.target.matches(':focus-visible')) setStopped(true)
    }}>
    <div className="fp-section-heading"><h2 id="fp-spaces-heading">{copy.spaces}</h2><p>{copy.spacesIntro}</p></div>
    <div className="space-panel">
      <ClubGallery locale={locale} active={active} onChange={select} navigation={navigation}
        stopped={stopped || reduced} reduced={reduced} onToggle={() => setStopped(value => !value)} />
      <div className="space-copy" id={id + '-panel'} role="tabpanel" aria-labelledby={id + '-tab-' + active} tabIndex={0} aria-live={stopped || reduced ? 'polite' : 'off'}>
        <p className="eyebrow">{copy[`${room}Detail`]}</p>
        <h3>{copy[room]}</h3><p>{copy[`${room}Text`]}</p>
        <p className="space-access">{copy[`${room}Access`]}</p>
        <Link className="fp-inline-link" to="#memberships">{room === 'changing' ? copy.visitOptions : copy[`${room}Action`]}<ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
  </section>
}
