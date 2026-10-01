import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import { ApiError, type Role } from '@/api/types'
import { useToast } from '@/components/feedback'

export const useSession = () => useQuery({ queryKey: ['session'], queryFn: api.session, retry: false, staleTime: Infinity })
export const accountPath = (role: Role) => role === 'CLIENT' ? '/account' : role === 'TRAINER' ? '/trainer' : '/admin'

export function useLogout() {
  const client = useQueryClient()
  const toast = useToast()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: ['session'] })
      await client.cancelQueries({ queryKey: ['account'] })
      client.setQueryData(['session'], null)
      client.removeQueries({ queryKey: ['account'] })
    },
    onError: error => toast(t('error.' + (error instanceof ApiError ? error.code : 'unknown'), { defaultValue: t('error.unknown') }), true),
  })
}
