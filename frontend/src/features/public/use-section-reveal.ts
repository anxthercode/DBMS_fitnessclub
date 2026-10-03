import { useEffect, useRef } from 'react'

// Content stays visible without animation support and is never hidden from focus.
export function useSectionReveal() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.setAttribute('data-revealed', 'true')
        observer.unobserve(entry.target)
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' })
    root.current.querySelectorAll('[data-reveal]').forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])
  return root
}
