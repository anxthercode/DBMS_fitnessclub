import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { homeCopy, type HomeLocale } from './home-content'

const poster = '/images/home/club-tour-poster.webp'

export function ClubHero({ locale, hours }: { locale: HomeLocale; hours: string }) {
  const copy = homeCopy[locale]
  const root = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [visible, setVisible] = useState(true)
  const [hidden, setHidden] = useState(document.hidden)
  const [stopped, setStopped] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setReduced(media.matches)
    const visibility = () => setHidden(document.hidden)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .1 })
    if (root.current) observer.observe(root.current)
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', motion)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    const element = video.current
    if (!element) return
    let cancelled = false
    if (!reduced && !stopped && visible && !hidden && !failed && !blocked) {
      void element.play().catch(() => { if (!cancelled) setBlocked(true) })
    } else element.pause()
    return () => { cancelled = true; element.pause() }
  }, [reduced, stopped, visible, hidden, failed, blocked])

  function toggleVideo() {
    if (playing) setStopped(true)
    else { setStopped(false); setBlocked(false) }
  }

  return <section className="fp-hero" ref={root} aria-labelledby="fp-title">
    <div className="hero-media" aria-hidden="true">
      <img className="hero-poster" src={poster} width="1280" height="720" fetchPriority="high" alt="" />
      {!reduced && !failed && <video ref={video} src="/videos/home/club-tour.mp4" poster={poster}
        muted loop playsInline preload="metadata" tabIndex={-1}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setFailed(true); setPlaying(false) }} />}
    </div>
    <div className="fp-shell hero-content">
      <div className="hero-topline"><p>{copy.intro}</p><span>{hours}</span></div>
      <div className="hero-heading"><h1 id="fp-title">NORTHSIDE<span>Fitness Club</span></h1></div>
      <div className="hero-bottom">
        <div className="fp-hero-actions"><Link className="fp-primary" to="#guest-visit">{copy.heroAction}<ArrowUpRight size={20} aria-hidden="true" /></Link><Link className="hero-secondary" to="#memberships">{copy.choose}<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <button className="hero-playback" type="button" onClick={toggleVideo} disabled={reduced || failed}
          aria-label={reduced ? copy.videoReduced : failed ? copy.videoUnavailable : playing ? copy.pauseVideo : copy.playVideo}
          title={reduced ? copy.videoReduced : failed ? copy.videoUnavailable : playing ? copy.pauseVideo : copy.playVideo}>
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  </section>
}
