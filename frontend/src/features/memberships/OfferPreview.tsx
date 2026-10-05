import { useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check, Dumbbell, Waves } from 'lucide-react'
import { api } from '@/api'
import type { AccessOfferPreview } from '@/api/types'
import { Loading, QueryError } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { money } from '@/lib/format'
import { offerCopy } from './offer-copy'
import './offers.css'
import { useNavigate } from 'react-router'
import type { CartItem, Selection, PutCartItem } from '@/api/commerce-types'
import { minskDay, validDate } from '@/api/commerce-rules'
import { useCommerceAction } from '@/features/commerce/hooks'
import { useCommerceCopy } from '@/features/commerce/copy'
import { CommerceError } from '@/features/commerce/shared'
import { useSession } from '@/features/auth/session'

export function OfferPreview({ item, version, initial }: { item?: CartItem; version?: number; initial?: Selection }) {
  const selection = item?.product || initial
  const { i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en' : 'ru'
  const copy = offerCopy[locale]
  const id = useId()
  const navigate = useNavigate()
  const { copy: purchase } = useCommerceCopy()
  const session = useSession()
  const request = useRef({ fingerprint: '', key: '' })
  const add = useCommerceAction((input: PutCartItem) => api.putCartItem(input), () => navigate('/cart'))
  const offers = useQuery({ queryKey: ['access-offers'], queryFn: api.offers })
  const [format, setFormat] = useState<AccessOfferPreview['format']>(selection?.format || 'membership')
  const [months, setMonths] = useState<1 | 3 | 12>(selection?.months || 3)
  const [gym, setGym] = useState(selection?.zones !== 'pool')
  const [pool, setPool] = useState(selection?.zones !== 'gym')
  const today = minskDay(Date.now())
  const [dates, setDates] = useState({ membership: selection?.date || today, single_visit: selection?.date || today })
  const date = dates[format]
  const zones = gym && pool ? 'both' : gym ? 'gym' : pool ? 'pool' : null
  const offer = offers.data?.find(item => item.format === format && item.zones === zones && item.months === (format === 'membership' ? months : null))
  const dateInvalid = !validDate(date) || date < today
  const dateLabel = format === 'membership' ? copy.startDate : copy.visitDate
  const displayDate = date && !dateInvalid ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-BY' : 'en-GB', { timeZone: 'Europe/Minsk', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00+03:00')) : copy.notChosen

  return <div className="offer-preview">
    <div className="offer-fields">
      <fieldset><legend>{copy.format}</legend>
        <div className="offer-segments">{(['membership', 'single_visit'] as const).map(value => <label key={value} className="offer-option">
          <input type="radio" name={id + '-format'} value={value} checked={format === value} onChange={() => setFormat(value)} />
          <span>{copy[value]}</span>
        </label>)}</div>
      </fieldset>
      {format === 'membership' && <fieldset><legend>{copy.term}</legend>
        <div className="offer-terms">{([1, 3, 12] as const).map(value => <label key={value} className="offer-option">
          <input type="radio" name={id + '-term'} value={value} checked={months === value} onChange={() => setMonths(value)} />
          <span>{copy[`month${value}`]}<Check size={16} aria-hidden="true" /></span>
        </label>)}</div>
      </fieldset>}
      <fieldset aria-describedby={!zones ? id + '-zones-error' : undefined}><legend>{copy.zones}</legend>
        <div className="offer-zones">{([{ key: 'gym', checked: gym, set: setGym, Icon: Dumbbell }, { key: 'pool', checked: pool, set: setPool, Icon: Waves }] as const).map(({ key, checked, set, Icon }) => <label key={key} className="offer-option offer-zone">
          <input type="checkbox" checked={checked} onChange={event => set(event.target.checked)} aria-invalid={!zones} />
          <span><span className="offer-zone-title"><Icon size={20} aria-hidden="true" /><strong>{copy[key]}</strong><Check className="offer-check" size={18} aria-hidden="true" /></span><small>{copy[`${key}Text`]}</small></span>
        </label>)}</div>
        {!zones && <p className="offer-error" id={id + '-zones-error'} role="alert">{copy.zoneError}</p>}
      </fieldset>
      <div className="offer-date">
        <label className="field-label" htmlFor={id + '-date'}>{dateLabel}</label>
        <input id={id + '-date'} type="date" min={today} max="9998-12-31" value={date} onChange={event => setDates({ ...dates, [format]: event.target.value })} required aria-invalid={dateInvalid} aria-describedby={id + '-date-hint' + (dateInvalid ? ' ' + id + '-date-error' : '')} />
        <p id={id + '-date-hint'}>{copy.timezone}</p>
        {dateInvalid && <p className="offer-error" id={id + '-date-error'} role="alert">{copy.dateError}</p>}
      </div>
      <p className="offer-included"><Check size={18} aria-hidden="true" /><span><strong>{copy.included}</strong>{copy.amenities}</span></p>
    </div>
    <aside className="offer-summary" aria-labelledby={id + '-summary'}>
      <h3 id={id + '-summary'}>{copy.summary}</h3>
      <div aria-live="polite" aria-atomic="true" className="offer-selection">
        <p className="offer-selection-title">{copy[format]}{format === 'membership' && ' · ' + copy[`month${months}`]}</p>
        <p>{zones ? copy[zones] : copy.zoneError}</p>
        <p>{dateLabel}: {displayDate}</p>
        {offers.isPending ? <Loading /> : offers.isError ? <QueryError retry={() => void offers.refetch()} /> : <>
          <p className="offer-total">{offer ? money(offer.price_byn, locale) : '—'}</p>
          <p className="offer-total-label">{format === 'membership' ? copy.total : copy.visitTotal}</p>
          {zones && !offer && <p>{copy.missing}</p>}
        </>}
      </div>
      <p className="offer-demo">{purchase.demo}</p>
      {format === 'membership' && <p className="offer-conditions">{purchase.coaching}: {offer?.allows_individual ? purchase.individual : offer?.allows_group ? purchase.group : purchase.independent}</p>}
      {format === 'single_visit' && <p className="offer-conditions">{copy.visitRule}</p>}
      <details className="offer-details"><summary>{copy.conditions}</summary>
        <p className="offer-conditions">{format === 'single_visit' ? copy.visitTraining : purchase.membershipRule}</p>
        {format === 'membership' && <><p className="offer-conditions">{purchase.coachingNote}</p><p className="offer-conditions">{purchase.overlap}</p></>}
      </details>
      <CommerceError error={add.error} />
      {add.error && <button type="button" className="underline min-h-11" onClick={() => void offers.refetch()}>{purchase.refresh}</button>}
      <Button type="button" disabled={!offer || dateInvalid || !zones || add.isPending || session.isPending || session.isError || (!!session.data && session.data.role !== 'CLIENT')} className="w-full" onClick={() => {
        if (!offer || !zones) return
        const selection = { format, months: format === 'membership' ? months : null, zones, date } as Selection
        const payload = { selection, expected_price_byn: offer.price_byn, expected_revision: offer.revision, ...(item ? { item_id: item.id, cart_version: version } : {}) }
        const fingerprint = JSON.stringify(payload)
        if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() }
        add.mutate({ ...payload, idempotency_key: request.current.key })
      }}>{add.isPending ? purchase.loading : item ? purchase.save : purchase.add}</Button>
      {session.data && session.data.role !== 'CLIENT' && <p>{purchase.clientOnlyText}</p>}

    </aside>
  </div>
}
