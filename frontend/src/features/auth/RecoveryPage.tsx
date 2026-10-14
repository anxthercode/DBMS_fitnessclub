import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { api, isMock } from '@/api'
import { Button } from '@/components/ui/button'
import { useTrainingCopy } from '@/features/training/copy'
import { TrainingError } from '@/features/training/shared'
import { accountDestination } from './redirect'
import { useTranslation } from 'react-i18next'
import { emailApi } from '@/api/http'
import { EmailError } from './EmailActions'

export function RecoveryPage() {
  const { t } = useTranslation()
  const { copy } = useTrainingCopy()
  const [email, setEmail] = useState('')
  const [params] = useSearchParams()
  const mutation = useMutation({ mutationFn: () => isMock ? api.recoverDemoPassword(email) : emailApi.forgot(email) })
  return <section className="container-shell page-section training-page"><div className="commerce-card max-w-xl mx-auto"><h1 className="page-title">{copy.recovery}</h1><p>{isMock ? copy.recoveryNote : t('email.recoveryNote')}</p>
    <form onSubmit={e => { e.preventDefault(); mutation.mutate() }}><label className="training-label" htmlFor="recovery-email">{copy.email}</label><input id="recovery-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); mutation.reset() }} /><Button className="mt-5" disabled={mutation.isPending}>{isMock ? copy.recover : t('email.recoverAction')}</Button></form>
    {mutation.isSuccess && <p role="status">{isMock ? copy.recovered : t('email.recoveryAccepted')}</p>}{isMock ? <TrainingError error={mutation.error} /> : <EmailError error={mutation.error} />}<Link className="training-link" to={'/login?redirect=' + encodeURIComponent(accountDestination(params.get('redirect')))}>{copy.backLogin}</Link>
  </div></section>
}
