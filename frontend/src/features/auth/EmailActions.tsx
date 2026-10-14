import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { emailApi } from '@/api/http'
import { ApiError } from '@/api/types'
import { isMock } from '@/api'
import { Button } from '@/components/ui/button'
import { PasswordInput } from './form-fields'
import { useSession } from './session'

export function EmailError({ error }: { error: Error | null }) {
  const { t } = useTranslation()
  return error ? <p role="alert">{t('error.' + (error instanceof ApiError ? error.code : 'unknown'), { defaultValue: t('error.unknown') })}</p> : null
}

export function EmailNotice() {
  const { t } = useTranslation()
  const session = useSession()
  const mutation = useMutation({ mutationFn: emailApi.resend })
  if (isMock || !session.data || session.data.email_verified_at) return null
  return <div className="commerce-card mb-6"><p>{t('email.verifyNotice')}</p>
    {session.data.email_delivery === 'failed' && !mutation.isSuccess && <p role="alert">{t('error.mail_unavailable')}</p>}
    <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{t('email.resend')}</Button>
    {mutation.isSuccess && <p role="status">{t('email.sent')}</p>}<EmailError error={mutation.error} />
  </div>
}

export function EmailTokenPage({ reset = false }: { reset?: boolean }) {
  const { t } = useTranslation()
  const location = useLocation()
  const client = useQueryClient()
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const mutation = useMutation({
    mutationFn: () => reset ? emailApi.reset(token, password) : emailApi.verify(token),
    onSuccess: async () => {
      window.history.replaceState(null, '', location.pathname)
      await client.cancelQueries({ queryKey: ['account'] })
      client.removeQueries({ queryKey: ['account'] })
      await client.invalidateQueries({ queryKey: ['session'] })
    },
  })
  return <section className="container-shell page-section"><div className="commerce-card max-w-xl mx-auto">
    <h1 className="page-title">{t(reset ? 'email.resetTitle' : 'email.verifyTitle')}</h1>
    {isMock ? <p>{t('email.httpOnly')}</p> : mutation.isSuccess ? <p role="status">{t(reset ? 'email.resetDone' : 'email.verified')}</p> : <form onSubmit={event => { event.preventDefault(); mutation.mutate() }}>
      {reset && <><label className="field-label" htmlFor="new-password">{t('auth.password')}</label><PasswordInput id="new-password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        <label className="field-label" htmlFor="confirm-password">{t('auth.confirmPassword')}</label><PasswordInput id="confirm-password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        {confirmation && confirmation !== password && <p role="alert">{t('auth.passwordMismatch')}</p>}</>}
      {!token && <p role="alert">{t('error.invalid_token')}</p>}
      <Button className="mt-5" disabled={!token || mutation.isPending || (reset && (!password.trim() || password !== confirmation))}>{t(reset ? 'email.resetAction' : 'email.verifyAction')}</Button>
      <EmailError error={mutation.error} />
    </form>}
    <Link className="training-link" to={reset ? '/login' : '/account'}>{t(reset ? 'auth.login' : 'nav.account')}</Link>
  </div></section>
}
