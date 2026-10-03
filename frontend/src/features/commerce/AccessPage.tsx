import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useOutletContext, useParams } from 'react-router'
import { api } from '@/api'
import type { User } from '@/api/types'
import type { AccessGrant } from '@/api/commerce-types'
import { accessStatus } from '@/api/commerce-rules'
import { date } from '@/lib/format'
import { Loading, QueryError } from '@/components/feedback'
import { offerCopy } from '@/features/memberships/offer-copy'
import { useCommerceCopy } from './copy'
import { CommerceError, ProductDescription, ZoneBadges } from './shared'

function useAccesses() {
  const user = useOutletContext<User>()
  return useQuery({ queryKey: ['account', user.id, 'accesses'], queryFn: api.accesses, retry: false })
}
function useClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [])
  return now
}
export function AccessBadge({ access, now }: { access: AccessGrant; now: number }) {
  const { copy } = useCommerceCopy()
  const status = accessStatus(access, now)
  return <span className={'status-badge access-status-' + status}>{copy[status === 'pending' ? 'upcoming' : status]}</span>
}
export function PassList() {
  const accesses = useAccesses()
  const { copy, locale } = useCommerceCopy()
  const now = useClock()
  const passes = accesses.data?.filter(a => a.format === 'single_visit') || []
  return <section className="pass-list"><h2 className="text-3xl">{copy.passes}</h2><p className="commerce-intro">{copy.visitRule}</p>
    {accesses.isPending ? <Loading /> : accesses.isError ? <QueryError retry={() => void accesses.refetch()} /> : !passes.length ? <p>{copy.noPasses}</p> : <div className="commerce-items">{passes.map(access => <article className="commerce-card" key={access.id}>
      <div className="commerce-row"><h3>{date(access.starts_at, locale, { day: 'numeric', month: 'long', year: 'numeric' })}</h3><AccessBadge access={access} now={now} /></div>
      <ZoneBadges zones={access.zones} /><p>{access.redeemed_at ? copy.redeemed + ': ' + date(access.redeemed_at, locale) : copy.noEntry}</p>
      {!access.order_id && <p className="rate-note">{copy.fixture}</p>}<Link className="underline min-h-11 inline-flex items-center" to={'/account/access/' + access.id}>{copy.details} ↗</Link>
    </article>)}</div>}
  </section>
}
export function AccessPage() {
  const { id } = useParams()
  const accesses = useAccesses()
  const { copy, locale } = useCommerceCopy()
  const now = useClock()
  if (accesses.isPending) return <Loading />
  if (accesses.isError) return <QueryError retry={() => void accesses.refetch()} />
  const access = accesses.data.find(a => a.id === id)
  if (!access) return <CommerceError error="not_found" />
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
  return <section className="commerce-page">
    <Link className="underline" to="/account/memberships">← {copy.access}</Link>
    <h1 className="page-title mt-6">{offerCopy[locale][access.format]}</h1><p className="commerce-intro">{copy.accessIntro}</p>
    <article className="commerce-card"><AccessBadge access={access} now={now} />
      {access.product ? <ProductDescription product={access.product} /> : <ZoneBadges zones={access.zones} />}
      <h2>{copy.accessDates}</h2><dl className="access-dates"><div><dt>{copy.starts}</dt><dd>{date(access.starts_at, locale, options)}</dd></div><div><dt>{copy.ends}</dt><dd>{date(access.ends_at, locale, options)}</dd></div></dl>
      <p>{offerCopy[locale].amenities}</p><p>{access.format === 'single_visit' ? copy.visitRule : copy.membershipRule}</p>
      <p>{copy.coaching}: {access.allows_individual ? copy.individual : access.allows_group ? copy.group : copy.independent}</p><p>{copy.coachingNote}</p>
      {access.format === 'single_visit' && <p>{access.redeemed_at ? copy.redeemed + ': ' + date(access.redeemed_at, locale, options) : copy.noEntry}</p>}
      {access.order_id ? <Link className="underline min-h-11 inline-flex items-center" to={'/account/orders/' + access.order_id}>{copy.order} #{access.order_id} ↗</Link> : <p className="rate-note">{copy.fixture}</p>}
    </article>
  </section>
}
