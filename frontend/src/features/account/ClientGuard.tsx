import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LockKeyhole } from 'lucide-react'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { accountDestination } from '@/features/auth/redirect'

export function ClientGuard() {
  const session = useSession()
  const location = useLocation()
  const { t } = useTranslation()
  if (session.isPending) return <Loading />
  if (session.isError) return <div className="container-shell py-12"><QueryError retry={() => void session.refetch()} /></div>
  if (!session.data) return <Navigate to={'/login?redirect=' + encodeURIComponent(accountDestination(location.pathname))} replace />
  if (session.data.role !== 'CLIENT') return (
    <section className="container-shell py-20">
      <LockKeyhole className="mb-6 size-9 text-muted-foreground" />
      <h1 className="page-title">{t('account.clientOnly')}</h1>
      <p className="mt-5 max-w-lg leading-7 text-muted-foreground">{t('account.clientOnlyText')}</p>
      <Button asChild className="mt-7"><Link to="/">{t('common.back')}</Link></Button>
    </section>
  )
  return <Outlet context={session.data} />
}
