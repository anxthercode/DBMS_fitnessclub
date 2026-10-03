import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { api, isMock } from '@/api'
import { Button } from '@/components/ui/button'
import { useSession } from './session'
import { useTrainingCopy } from '@/features/training/copy'
import { useTrainingAction } from '@/features/training/hooks'
import { TrainingError } from '@/features/training/shared'

export function DemoAuth() {
  const { copy } = useTrainingCopy()
  const session = useSession()
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const verify = useTrainingAction(() => api.verifyDemoEmail(), user => client.setQueryData(['session'], user))
  const expire = useMutation({ mutationFn: api.expireDemoSession, onSuccess: async () => {
    await client.cancelQueries({ queryKey: ['account'] })
    await client.cancelQueries({ queryKey: ['session'] })
    client.setQueryData(['session-expired'], true)
    client.setQueryData(['session'], null)
    client.removeQueries({ queryKey: ['account'] })
    navigate('/login?expired=1&redirect=' + encodeURIComponent(location.pathname), { replace: true })
  } })
  if (!isMock) return null
  return <div className="demo-scenario mt-8"><h2>{copy.demoAuth}</h2>{!session.data?.email_verified_at && <><p>{copy.verifyNote}</p><Button variant="outline" disabled={verify.isPending || expire.isPending} onClick={() => verify.mutate()}>{copy.verify}</Button></>}<div className="commerce-actions"><Button variant="outline" disabled={expire.isPending || verify.isPending} onClick={() => expire.mutate()}>{copy.expire}</Button></div><TrainingError error={verify.error || expire.error} /></div>
}
