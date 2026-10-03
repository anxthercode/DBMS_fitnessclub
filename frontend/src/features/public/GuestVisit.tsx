import { lazy, Suspense, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { homeCopy } from './home-content'

const GuestForm = lazy(async () => ({ default: (await import('./GuestForm')).GuestForm }))

export function GuestVisit({ locale }: { locale: 'ru' | 'en' }) {
  const copy = homeCopy[locale]
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function close() { setOpen(false); trigger.current?.focus() }

  return <section className="fp-guest" id="guest-visit" tabIndex={-1} aria-labelledby="fp-guest-heading">
    <div className="fp-guest-overview">
      <h2 id="fp-guest-heading">{copy.guestTitle}</h2>
      <div><p className="fp-guest-intro">{copy.guestIntro}</p><p className="fp-guest-terms">{copy.guestTerms}</p></div>
      <button ref={trigger} className="fp-primary" type="button" aria-expanded={open} aria-controls="fp-guest-form" onClick={() => open ? close() : setOpen(true)}>{open ? copy.guestClose : copy.guestAction}<ArrowUpRight size={16} aria-hidden="true" /></button>
    </div>
    {open && <Suspense fallback={<p role="status" className="mt-5 text-sm">{copy.guestLoading}</p>}><GuestForm copy={copy} close={close} /></Suspense>}
  </section>
}
