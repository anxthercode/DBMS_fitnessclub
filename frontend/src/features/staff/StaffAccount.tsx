import { Link } from 'react-router'
import { api } from '@/api'
import { useSession } from '@/features/auth/session'
import { ProfileForm } from '@/features/account/ProfilePage'
import { usePrivateQuery } from '@/features/training/hooks'
import { NotificationsPage } from '@/features/training/NotificationsPage'
import { useWords } from './shared'

export function StaffAccountLinks() {
  const w = useWords()
  const notifications = usePrivateQuery(['notifications'], api.notifications, true, 'authenticated')
  const unread = notifications.data?.filter(n => !n.read_at).length || 0
  return <nav className="staff-account-links" aria-label={w('Личные настройки', 'Personal settings')}>
    <Link to="?section=profile">{w('Профиль', 'Profile')}</Link>
    <Link to="?section=notifications">{w('Уведомления', 'Notifications')}{unread > 0 && ` (${unread})`}</Link>
  </nav>
}

export function StaffAccount({ section }: { section: string }) {
  const { data: user } = useSession()
  return section === 'profile' && user ? <ProfileForm key={user.id} user={user} embedded /> : <NotificationsPage staff />
}
