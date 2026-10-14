import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { api, isMock } from '@/api'
import { Button } from '@/components/ui/button'
import { useTrainingCopy } from '@/features/training/copy'
import { TrainingError } from '@/features/training/shared'

export function DemoAuth() {
  const { copy } = useTrainingCopy()
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const expire = useMutation({ mutationFn: api.expireDemoSession, onSuccess: async () => {
    await client.cancelQueries({ queryKey: ['account'] })
    await client.cancelQueries({ queryKey: ['session'] })
    client.setQueryData(['session-expired'], true)
    client.setQueryData(['session'], null)
    client.removeQueries({ queryKey: ['account'] })
    navigate('/login?expired=1&redirect=' + encodeURIComponent(location.pathname), { replace: true })
  } })
  if (!isMock) return null
  return <div className="demo-scenario mt-8"><h2>{copy.demoAuth}</h2><Button variant="outline" disabled={expire.isPending} onClick={() => expire.mutate()}>{copy.expire}</Button><TrainingError error={expire.error} /></div>
}
