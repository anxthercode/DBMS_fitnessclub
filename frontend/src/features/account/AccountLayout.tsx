import { Link, NavLink, Outlet, useOutletContext } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CreditCard, UserRound, LayoutDashboard, CalendarDays, Bell } from 'lucide-react'
import { isMock, api } from '@/api'
import type { User } from '@/api/types'

import { usePrivateQuery } from '@/features/training/hooks'

const links = [
  { to: '/account', label: 'account.overview', Icon: LayoutDashboard },
  { to: '/account/bookings', label: 'account.bookings', Icon: CalendarDays },
  { to: '/account/notifications', label: 'account.notifications', Icon: Bell },
  { to: '/account/memberships', label: 'account.memberships', Icon: CreditCard },
  { to: '/account/orders', label: 'account.orders', Icon: CreditCard },
  { to: '/account/profile', label: 'dash.profile', Icon: UserRound, LayoutDashboard, CalendarDays, Bell },
]

export function AccountLayout() {
  const notifications = usePrivateQuery(['notifications'], api.notifications)
  const unread = notifications.data?.filter(n => !n.read_at).length || 0
  const user = useOutletContext<User>()
  const { t } = useTranslation()
  return (
    <div className="container-shell page-section account-shell">
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:border-r lg:border-border lg:pr-7">
          <p className="eyebrow text-muted-foreground">{t('account.eyebrow')}</p>
          <div className="mt-5 flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded border border-border bg-card text-sm font-semibold text-accent-ink">{user.first_name[0]}{user.last_name[0]}</span>
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{user.first_name} {user.last_name}</p><p className="mt-1 text-xs text-muted-foreground">{t('role.CLIENT')}</p></div>
          </div>
          <nav aria-label={t('account.navigation')} className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {links.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/account'} className={({ isActive }) =>
              'flex min-h-12 items-center gap-2 rounded px-3 py-3 text-sm transition-colors ' + (isActive ? 'bg-card font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <Icon className="size-4 shrink-0" /><span>{t(label)}{to === '/account/notifications' && unread > 0 && <span className="ml-2">({unread})</span>}</span>
            </NavLink>)}
          </nav>
          <Link to="/" className="mt-7 hidden min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:flex"><ArrowLeft className="size-4" />{t('dash.club')}</Link>
          {isMock && <p className="mt-6 hidden border-t border-border pt-5 text-xs leading-6 text-muted-foreground lg:block">{t('account.demoNote')}</p>}
        </aside>
        <div className="account-content min-w-0"><Outlet context={user} /></div>
      </div>
      {isMock && <p className="mt-8 text-xs leading-6 text-muted-foreground lg:hidden">{t('account.demoNote')}</p>}
    </div>
  )
}
