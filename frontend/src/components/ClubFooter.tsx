import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { api } from '@/api'
import { Brand } from './brand'
import './club-footer.css'

export function ClubFooter({ links }: { links: ReadonlyArray<readonly [string, string]> }) {
  const { t } = useTranslation()
  const club = useQuery({ queryKey: ['club'], queryFn: api.club })
  return <footer id="contacts" tabIndex={-1} className="site-footer" aria-labelledby="footer-contact-heading">
    <div className="container-shell">
      <div className="footer-grid">
        <div className="footer-intro">
          <Brand />
          <p>{t('footer.text')}</p>
          <Link className="footer-visit" to="/#guest-visit">{t('footer.firstVisit')}<ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="footer-address">
          <h2 id="footer-contact-heading">{t('nav.contacts')}</h2>
          <address><span>{t('footer.location')}</span><strong>{t('footer.address')}</strong></address>
        </div>
        <div className="footer-hours">
          <h2>{t('footer.hours')}</h2>
          <p>{t('footer.daily')}</p>
          <strong>{club.data?.hours || '07:00–23:00'}</strong>
        </div>
        <div className="footer-navigation">
          <h2>{t('footer.explore')}</h2>
          <nav aria-label={t('nav.footer')}>
            {links.filter(([, label]) => label !== 'contacts').map(([to, label]) => <Link key={to} to={to}>{t('nav.' + label)}</Link>)}
          </nav>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} NORTHSIDE Fitness Club</p>
        <Link to="/#main">{t('footer.backToTop')}<ArrowUp size={16} aria-hidden="true" /></Link>
      </div>
    </div>
  </footer>
}
