import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { api, isMock } from '@/api'
import { Button } from '@/components/ui/button'
import { useTrainingCopy } from '@/features/training/copy'
import { TrainingError } from '@/features/training/shared'
import { accountDestination } from './redirect'

export function RecoveryPage() {
  const { copy } = useTrainingCopy()
  const [email, setEmail] = useState('')
  const [params] = useSearchParams()
  const mutation = useMutation({ mutationFn: () => api.recoverDemoPassword(email) })
  return <section className="container-shell page-section training-page"><div className="commerce-card max-w-xl mx-auto"><h1 className="page-title">{copy.recovery}</h1><p>{copy.recoveryNote}</p>
    {isMock && <form onSubmit={e => { e.preventDefault(); mutation.mutate() }}><label className="training-label" htmlFor="recovery-email">{copy.email}</label><input id="recovery-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); mutation.reset() }} /><Button className="mt-5" disabled={mutation.isPending}>{copy.recover}</Button></form>}
    {mutation.isSuccess && <p role="status">{copy.recovered}</p>}<TrainingError error={mutation.error} /><Link className="training-link" to={'/login?redirect=' + encodeURIComponent(accountDestination(params.get('redirect')))}>{copy.backLogin}</Link>
  </div></section>
}
