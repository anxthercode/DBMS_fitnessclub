import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { isMock } from '@/api'
import { Brand } from '@/components/brand'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { useLogout, useSession } from '@/features/auth/session'

const links = [['/#club', 'about'], ['/plans', 'plans'], ['/trainers', 'trainers'], ['/#contacts', 'contacts']] as const
const pageTitles: Record<string, string> = {
  '/': 'home.pageTitle', '/design-preview': 'home.pageTitle', '/plans': 'nav.plans', '/trainers': 'nav.trainers',
  '/login': 'auth.login', '/register': 'auth.register',
  '/account': 'nav.account', '/account/profile': 'profile.title', '/account/memberships': 'account.memberships',
}

export function PublicLayout() {
  const { t, i18n } = useTranslation()
  const { data: user } = useSession()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(location.pathname)
  const logout = useLogout()
  const signOut = () => logout.mutate(undefined, { onSuccess: () => setOpen(false) })

  useEffect(() => {
    setOpen(false)
    // Home sections render synchronously; anchors work on first load, from other
    // routes and on repeated navigation, without timing a scroll against a request.
    const anchor = ['#club', '#contacts', '#memberships', '#main'].includes(location.hash)
      ? document.getElementById(location.hash.slice(1)) : null
    if (anchor) {
      anchor.focus({ preventScroll: true })
      anchor.scrollIntoView({ behavior: 'instant', block: 'start' })
    } else if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      main.current?.focus({ preventScroll: true })
    }
    previousPath.current = location.pathname
  }, [location.key, location.pathname, location.hash])

  useEffect(() => {
    document.title = t(pageTitles[location.pathname] || 'notFound.title') + ' — FORMA'
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('home.meta'))
  }, [location.pathname, t, i18n.language])

  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus() }
    }
    const desktop = window.matchMedia('(min-width: 1280px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    document.addEventListener('keydown', close)
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.removeEventListener('keydown', close)
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [open])

  function navLinks(mobile = false) {
    return links.map(([to, label]) => {
      const active = to.includes('#')
        ? (location.pathname === '/' || location.pathname === '/design-preview') && location.hash === to.slice(1)
        : location.pathname === to
      return <Link key={to} to={to} aria-current={active ? (to.includes('#') ? 'location' : 'page') : undefined}
        onClick={() => setOpen(false)}
        className={(mobile ? 'border-t border-border py-3 text-sm ' : 'site-link ') + (active ? 'text-primary underline underline-offset-8' : 'hover:text-primary')}>
        {t('nav.' + label)}
      </Link>
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a className="skip-link" href="#main">{t('common.skip')}</a>
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="container-shell flex min-h-[72px] items-center justify-between gap-3 py-3 md:min-h-[88px]">
          <Brand />
          <nav className="hidden items-center gap-7 xl:flex" aria-label={t('nav.primary')}>{navLinks()}</nav>
          <div className="flex items-center gap-2 sm:gap-5">
            <LanguageSwitch />
            {user ? <div className="hidden items-center gap-4 sm:flex">
              {user.role === 'CLIENT'
                ? <Link to="/account" className="site-link">{t('nav.account')}</Link>
                : <span className="max-w-28 truncate text-sm">{user.first_name}</span>}
              <Button variant="ghost" onClick={signOut} disabled={logout.isPending}>{t('auth.logout')}</Button>
            </div> : <div className="hidden sm:block"><Link className="site-link" to="/login">{t('nav.login')}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
            <Button ref={menuButton} variant="ghost" size="icon" className="xl:hidden"
              aria-label={t(open ? 'nav.closeMenu' : 'nav.menu')} aria-controls="mobile-menu" aria-expanded={open}
              onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
          </div>
        </div>
        {open && <nav id="mobile-menu" className="container-shell flex max-h-[70dvh] flex-col overflow-y-auto pb-4 xl:hidden" aria-label={t('nav.mobile')}>
          {navLinks(true)}
          {user ? <>
            {user.role === 'CLIENT' && <Link to="/account" className="site-link border-t border-border py-3" onClick={() => setOpen(false)}>{t('nav.account')}</Link>}
            <Button variant="outline" className="mt-2 self-start" disabled={logout.isPending} onClick={signOut}>{t('auth.logout')}</Button>
          </> : <Link className="site-link border-t border-border py-3" to="/login" onClick={() => setOpen(false)}>{t('nav.login')}</Link>}
        </nav>}
      </header>
      <main id="main" ref={main} tabIndex={-1} className="flex-1 focus:outline-none"><Outlet /></main>
      <footer className="mt-16 border-t border-border py-8">
        <div className="container-shell">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div><Brand /><p className="mt-4 text-xs">{t('footer.text')}</p></div>
            <nav aria-label={t('nav.footer')} className="flex flex-wrap gap-x-6 gap-y-1">
              {links.map(([to, label]) => <Link key={to} to={to} className="site-link">{t('nav.' + label)}</Link>)}
            </nav>
          </div>
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-xs">
            <p>© {new Date().getFullYear()} FORMA</p>
            {isMock && <p>{t('footer.note')}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
