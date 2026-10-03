import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import type { User } from '@/api/types'
import { useSession } from '@/features/auth/session'

export function useCart() {
  const session = useSession()
  const owner = session.data?.id || 'guest'
  const query = useQuery({ queryKey: ['account', owner, 'cart'], queryFn: api.cart, retry: false,
    enabled: !session.isPending && !session.isError && (!session.data || session.data.role === 'CLIENT') })
  return { ...query, owner, session }
}
export function useCommerceAction<T, R>(fn: (input: T) => Promise<R>, success?: (result: R) => void) {
  const client = useQueryClient()
  const { data: session } = useSession()
  const owner = session?.id || 'guest'
  return useMutation({ mutationFn: fn, onSuccess: async result => {
    if ((client.getQueryData<User | null>(['session'])?.id || 'guest') !== owner) return
    await client.invalidateQueries({ queryKey: ['account', owner] })
    if ((client.getQueryData<User | null>(['session'])?.id || 'guest') === owner) success?.(result)
  } })
}
