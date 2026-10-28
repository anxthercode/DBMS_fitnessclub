import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronDown, UserRound } from 'lucide-react'
import type { User } from '@/api/types'
import { Button } from './ui/button'

export function AccountMenu({ user, signOut, busy }: { user: User; signOut: () => void; busy: boolean }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => setOpen(false), [location.key])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return <div className="account-menu" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <Button ref={trigger} variant="ghost" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <UserRound size={18} aria-hidden="true" />{t('nav.account')}<ChevronDown size={15} aria-hidden="true" />
    </Button>
    {open && <div id={id} className="account-menu-panel">
      <p>{user.first_name}</p>
      <Link to={user.role === 'CLIENT' ? '/account' : user.role === 'ADMIN' ? '/admin' : '/trainer'}>{t('account.overview')}</Link>
      {user.role === 'CLIENT' && <Link to="/account/profile">{t('profile.title')}</Link>}
      <button type="button" disabled={busy} onClick={signOut}>{t('auth.logout')}</button>
    </div>}
  </div>
}
