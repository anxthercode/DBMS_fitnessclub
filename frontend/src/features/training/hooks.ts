import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, type User } from '@/api/types'
import { useSession } from '@/features/auth/session'

export function useClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const update = () => setNow(Date.now()); const timer = window.setInterval(update, 1000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update) } }, [])
  return now
}
export function usePrivateQuery<T>(key: string[], queryFn: () => Promise<T>) {
  const session = useSession()
  const client = useQueryClient()
  const result = useQuery({ queryKey: ['account', session.data?.id || 'guest', ...key], queryFn, enabled: session.data?.role === 'CLIENT', retry: false, refetchInterval: 30_000 })
  useEffect(() => {
    if (result.error instanceof ApiError && result.error.status === 401) {
      client.setQueryData(['session-expired'], true)
      client.setQueryData(['session'], null)
      void client.cancelQueries({ queryKey: ['account'] }).then(() => client.removeQueries({ queryKey: ['account'] }))
    }
  }, [result.error, client])
  return result
}
export function useTrainingAction<T, R>(fn: (input: T) => Promise<R>, success?: (result: R) => void) {
  const client = useQueryClient()
  const session = useSession()
  const owner = session.data?.id
  return useMutation({ mutationFn: fn, onSuccess: async result => {
    if (client.getQueryData<User | null>(['session'])?.id !== owner) return
    await Promise.all([client.invalidateQueries({ queryKey: ['account', owner] }), client.invalidateQueries({ queryKey: ['schedule'] })])
    if (client.getQueryData<User | null>(['session'])?.id === owner) success?.(result)
  }, onError: error => {
    if (error instanceof ApiError && error.status === 401 && client.getQueryData<User | null>(['session'])?.id === owner) {
      client.setQueryData(['session-expired'], true)
      client.setQueryData(['session'], null)
      void client.cancelQueries({ queryKey: ['account'] }).then(() => client.removeQueries({ queryKey: ['account'] }))
    }
  } })
}
