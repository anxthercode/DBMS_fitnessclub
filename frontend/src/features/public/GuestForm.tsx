import { useMutation } from '@tanstack/react-query'
import { isMock } from '@/api'
import { request } from '@/api/http'
import { StaffError, useWords } from '@/features/staff/shared'
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
  const w = useWords()
  const submit = useMutation({ mutationFn: (values: GuestValues) => request('/first-visits', 'POST', values) })
  const [checked, setChecked] = useState(false)

  useEffect(() => { setFocus('name') }, [setFocus])

  return <form id="fp-guest-form" className="fp-guest-form" aria-labelledby="fp-guest-form-heading" aria-describedby="fp-guest-note" noValidate
    onSubmit={handleSubmit(values => { if (isMock) setChecked(true); else submit.mutate(values) }, () => setChecked(false))}
    onChange={() => setChecked(false)}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }}>
    <h4 id="fp-guest-form-heading">{copy.guestFormTitle}</h4>
    <p className="fp-guest-terms">{copy.guestTerms}</p>
    <p id="fp-guest-note" className="fp-guest-note">{w('Администратор свяжется с вами, чтобы согласовать дату и зоны.', 'An administrator will contact you to agree a date and zones.')}</p>
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
    <div className="fp-guest-form-actions"><button className="fp-primary" type="submit" disabled={submit.isPending || submit.isSuccess}>{w('Записаться на первый визит', 'Request your first visit')}</button><button className="fp-inline-link" type="button" onClick={close}>{copy.guestCancel}</button></div>
    <StaffError error={submit.error} />
    {submit.isSuccess && <p role="status">{w('Заявка принята. Дождитесь звонка администратора.', 'Application received. Please wait for the administrator’s call.')}</p>}
    {checked && <p className="fp-guest-result" role="status">{w('Отправка заявки сейчас недоступна. Попробуйте позже.', 'Applications are currently unavailable. Please try again later.')}</p>}
  </form>
}
