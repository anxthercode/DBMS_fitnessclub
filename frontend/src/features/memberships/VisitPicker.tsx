import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { money } from '@/lib/format'
import { Loading, QueryError } from '@/components/feedback'
import type { Selection } from '@/api/commerce-types'
import { offerCopy } from './offer-copy'
import './offers.css'

// Preview the one-month/one-visit price; configuration and cart changes stay on /plans.
export function VisitPicker() {
  const { t, i18n } = useTranslation()
  const copy = offerCopy[i18n.language === 'en' ? 'en' : 'ru']
  const id = useId()
  const [format, setFormat] = useState<Selection['format']>('membership')
  const [zones, setZones] = useState<Selection['zones']>('both')
  const offers = useQuery({ queryKey: ['access-offers'], queryFn: api.offers })
  const offer = offers.data?.find(item => item.format === format && item.zones === zones && item.months === (format === 'membership' ? 1 : null))
  const params = new URLSearchParams({ format, zones, ...(format === 'membership' ? { months: '1' } : {}) })

  return <div className="visit-picker">
    <div className="offer-fields">
      <fieldset><legend>{copy.format}</legend>
        <div className="offer-segments">{(['membership', 'single_visit'] as const).map(value => <label key={value} className="offer-option">
          <input type="radio" name={id + '-format'} checked={format === value} onChange={() => setFormat(value)} />
          <span>{copy[value]}</span>
        </label>)}</div>
      </fieldset>
      <fieldset><legend>{copy.zones}</legend>
        <div className="visit-picker-zones">{(['gym', 'pool', 'both'] as const).map(value => <label key={value} className="offer-option">
          <input type="radio" name={id + '-zones'} checked={zones === value} onChange={() => setZones(value)} />
          <span>{value === 'both' ? t('plans.allZones') : copy[value]}<Check size={16} aria-hidden="true" /></span>
        </label>)}</div>
      </fieldset>
    </div>
    <div className="visit-picker-next">
      {offers.isPending ? <Loading /> : offers.isError ? <QueryError message={t('error.price')} retry={() => void offers.refetch()} /> : <div className="picker-price" aria-live="polite"><strong>{offer ? money(offer.price_byn, i18n.language) : copy.missing}</strong>{offer && <span>{format === 'membership' ? copy.month1 : copy.visitTotal}</span>}</div>}
      <p>{t(format === 'membership' ? 'plans.pickerMembershipNext' : 'plans.pickerVisitNext')}</p>
      <Link className="fp-primary" to={'/plans?' + params}>{t('plans.continueSelection')}<ArrowUpRight size={18} aria-hidden="true" /></Link>
    </div>
  </div>
}
