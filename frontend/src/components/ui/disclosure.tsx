import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import './disclosure.css'

export function AnimatedDisclosure({ title, children }: { title: ReactNode; children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null)
  const animation = useRef<Animation | null>(null)
  const targetOpen = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()

  useEffect(() => () => animation.current?.cancel(), [])

  function toggle() {
    const element = details.current
    if (!element) return
    const from = element.getBoundingClientRect().height
    animation.current?.cancel()
    targetOpen.current = !targetOpen.current
    setExpanded(targetOpen.current)
    element.open = targetOpen.current
    const to = element.getBoundingClientRect().height
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !element.animate) return
    // Keep native content available during closing, then restore native collapsed state.
    element.open = true
    const current = element.animate({ height: [`${from}px`, `${to}px`] }, {
      duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)',
    })
    animation.current = current
    current.onfinish = () => {
      element.open = targetOpen.current
      animation.current = null
    }
  }

  return <details className="fp-disclosure" ref={details}>
    <summary aria-expanded={expanded} aria-controls={contentId} onClick={event => { event.preventDefault(); toggle() }}>
      <span>{title}</span><Plus size={17} aria-hidden="true" />
    </summary>
    <div className="fp-disclosure-content" id={contentId}>{children}</div>
  </details>
}
