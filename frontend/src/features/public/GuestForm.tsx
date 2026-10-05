import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { homeCopy } from './home-content'

const guestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1).max(32).refine(value => {
    const digits = value.replace(/\D/g, '')
    return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
  }),
})
type GuestValues = z.infer<typeof guestSchema>
type Copy = (typeof homeCopy)[keyof typeof homeCopy]

export function GuestForm({ copy, close }: { copy: Copy; close: () => void }) {
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm<GuestValues>({
    resolver: zodResolver(guestSchema), defaultValues: { name: '', phone: '' },
  })
  const [checked, setChecked] = useState(false)

  useEffect(() => { setFocus('name') }, [setFocus])

  return <form id="fp-guest-form" className="fp-guest-form" aria-labelledby="fp-guest-form-heading" aria-describedby="fp-guest-demo" noValidate
    onSubmit={handleSubmit(() => setChecked(true), () => setChecked(false))}
    onChange={() => setChecked(false)}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }}>
    <h4 id="fp-guest-form-heading">{copy.guestFormTitle}</h4>
    <p className="fp-guest-terms">{copy.guestTerms}</p>
    <p id="fp-guest-demo" className="fp-guest-demo">{copy.guestDemo}</p>
    <div className="fp-guest-fields">
      <div>
        <label htmlFor="fp-guest-name">{copy.guestName}</label>
        <input id="fp-guest-name" autoComplete="given-name" maxLength={80} required {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'fp-guest-name-error' : undefined} />
        {errors.name && <p className="fp-field-error" id="fp-guest-name-error" role="alert">{copy.guestNameInvalid}</p>}
      </div>
      <div>
        <label htmlFor="fp-guest-phone">{copy.guestPhone}</label>
        <input id="fp-guest-phone" type="tel" autoComplete="tel" maxLength={32} required {...register('phone')} aria-invalid={!!errors.phone} aria-describedby={'fp-guest-phone-hint' + (errors.phone ? ' fp-guest-phone-error' : '')} />
        <p className="fp-field-hint" id="fp-guest-phone-hint">{copy.guestPhoneHint}</p>
        {errors.phone && <p className="fp-field-error" id="fp-guest-phone-error" role="alert">{copy.guestPhoneInvalid}</p>}
      </div>
    </div>
    <div className="fp-guest-form-actions"><button className="fp-primary" type="submit">{copy.guestSubmit}</button><button className="fp-inline-link" type="button" onClick={close}>{copy.guestCancel}</button></div>
    {checked && <p className="fp-guest-result" role="status">{copy.guestResult}</p>}
  </form>
}
