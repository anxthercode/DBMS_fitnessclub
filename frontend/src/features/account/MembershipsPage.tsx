import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useOutletContext } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, CreditCard } from 'lucide-react'
import { api } from '@/api'
import { ApiError, type Membership, type User } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { date, localized } from '@/lib/format'
import { membershipStatus, sortMemberships, type MembershipStatus } from './membership-status'

import { PassList } from '@/features/commerce/AccessPage'
import { ZoneBadges } from '@/features/commerce/shared'
import { useCommerceCopy } from '@/features/commerce/copy'

const badgeClasses: Record<MembershipStatus, string> = {
  active: 'bg-success/10 text-success', pending: 'bg-info/10 text-info',
  expired: 'bg-muted text-muted-foreground', cancelled: 'bg-destructive/10 text-destructive',
}
const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }

function useMembershipClock(memberships: Membership[] | undefined) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const current = Date.now()
    const boundaries = memberships?.flatMap(item => [Date.parse(item.starts_at), Date.parse(item.ends_at)]).filter(value => value > current) || []
    const next = Math.min(60_000, ...boundaries.map(value => value - current + 1))
    const refresh = () => setNow(Date.now())
    const timer = window.setTimeout(refresh, next)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [memberships, now])
  return now
}

export function MembershipsPage() {
  const { copy } = useCommerceCopy()
  const user = useOutletContext<User>()
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const memberships = useQuery({ queryKey: ['account', user.id, 'memberships'], queryFn: api.memberships, retry: false })
  const now = useMembershipClock(memberships.data)
  const [filter, setFilter] = useState<'all' | 'current' | 'history'>('all')
  useEffect(() => {
    if (memberships.error instanceof ApiError && memberships.error.status === 401) client.setQueryData(['session'], null)
  }, [memberships.error, client])
  const ordered = sortMemberships(memberships.data || [], now)
  const current = ordered.filter(item => ['active', 'pending'].includes(membershipStatus(item, now)))
  const history = ordered.filter(item => ['expired', 'cancelled'].includes(membershipStatus(item, now)))
  const groups = { all: ordered, current, history }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><h1 className="page-title">{t('account.memberships')}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{t('account.membershipsIntro')}</p></div>
        <Button asChild variant="outline"><Link to="/plans">{t('account.browsePlans')}<ArrowUpRight /></Link></Button>
      </div>
      {memberships.isPending ? <Loading /> : memberships.isError ? <div className="mt-8"><QueryError retry={() => void memberships.refetch()} /></div> : ordered.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
          <CreditCard className="mx-auto mb-5 size-9 text-muted-foreground" strokeWidth={1.3} />
          <h2 className="text-2xl font-semibold">{t('membership.none')}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{t('account.emptyMemberships')}</p>
          <Button asChild className="mt-6"><Link to="/plans">{t('home.cta')}<ArrowUpRight /></Link></Button>
        </div>
      ) : <>
        <div role="group" aria-label={t('account.filterMemberships')} className="mt-8 flex flex-wrap gap-2 border-b border-border pb-5">
          {(['all', 'current', 'history'] as const).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
            className="choice-pill">
            {t('account.filter.' + key)} <span className="ml-1">{groups[key].length}</span>
          </button>)}
        </div>
        <div className="mt-6 space-y-5" aria-live="polite">
          {groups[filter].length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">{t('account.noMembershipsInFilter')}</p> : groups[filter].map(item => {
            const status = membershipStatus(item, now)
            return (
              <article key={item.id} className="rounded-md border border-border bg-card p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="eyebrow text-muted-foreground">{t('account.membershipNumber', { id: item.id })}</p><h2 className="mt-2 text-2xl font-semibold">{localized(item, 'plan_name', i18n.language)}</h2></div>
                  <span className={'status-badge ' + badgeClasses[status]}>{t('membership.' + status)}</span>
                </div>
                <ZoneBadges zones={item.zones || 'both'} />
                <Link className="underline min-h-11 inline-flex items-center" to={'/account/access/membership-' + item.id}>{copy.details} ↗</Link>
                <dl className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">{t('account.startsAt')}</dt><dd className="mt-2 text-sm font-medium"><time dateTime={item.starts_at}>{date(item.starts_at, i18n.language, dateOptions)}</time></dd></div>
                  <div><dt className="text-xs text-muted-foreground">{t('account.endsAt')}</dt><dd className="mt-2 text-sm font-medium"><time dateTime={item.ends_at}>{date(item.ends_at, i18n.language, dateOptions)}</time></dd></div>
                </dl>
                {item.cancelled_at && <p className="mt-4 text-xs text-muted-foreground">{t('account.cancelledAt', { date: date(item.cancelled_at, i18n.language, dateOptions) })}</p>}
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-6 text-muted-foreground">
                  {['unlimited', ...(item.allows_group ? ['group'] : []), ...(item.allows_individual ? ['individual'] : [])].map(key => <li key={key} className="flex items-center gap-2"><Check className="size-3.5 shrink-0" />{t('plans.' + key)}</li>)}
                </ul>
              </article>
            )
          })}
        </div>
        <p className="mt-5 text-xs leading-6 text-muted-foreground">{t('account.membershipTimeNote')}</p>
      </>}
      <PassList />
    </section>
  )
}
