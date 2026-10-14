import { useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/types'
import type { CartItem } from '@/api/commerce-types'
import { putTrainingItem, trainingOffers } from '@/api/training-commerce'
import { Button } from '@/components/ui/button'
import { Loading, QueryError } from '@/components/feedback'
import { money } from '@/lib/format'
import { useCommerceAction } from './hooks'
import { useCommerceCopy } from './copy'
import { CommerceError } from './shared'

export function TrainingZoneEditor({ item, version, close, saved, reload }: { item: CartItem; version: number; close: () => void; saved: () => void; reload: () => Promise<unknown> }) {
  const { copy, locale } = useCommerceCopy()
  const id = useId()
  const [zone, setZone] = useState(item.product.zones)
  const [initialVersion] = useState(version)
  const key = useRef({ fingerprint: '', value: '' })
  const offers = useQuery({ queryKey: ['training-offers'], queryFn: trainingOffers, staleTime: 0 })
  const save = useCommerceAction(putTrainingItem, () => { saved(); close() })
  const selected = offers.data?.find(offer => offer.zones === zone)
  return <form className="training-zone-editor" aria-label={copy.editZone} onSubmit={event => {
    event.preventDefault()
    if (!selected || save.isPending) return
    const payload = { selection: { format: 'training' as const, zones: selected.zones, months: null, date: null }, item_id: item.id, cart_version: initialVersion, expected_price_byn: selected.price_byn, expected_revision: selected.revision }
    const fingerprint = JSON.stringify(payload)
    if (key.current.fingerprint !== fingerprint) key.current = { fingerprint, value: crypto.randomUUID() }
    save.mutate({ ...payload, idempotency_key: key.current.value })
  }} onKeyDown={event => { if (event.key === 'Escape' && !save.isPending) { event.preventDefault(); close() } }}>
    <fieldset disabled={save.isPending || offers.isFetching} aria-describedby={id + '-note'}>
      <legend>{copy.editZone}</legend>
      {offers.isPending ? <Loading /> : offers.isError ? <QueryError retry={() => void offers.refetch()} /> : <div className="training-zone-options">{(['gym', 'pool'] as const).map(value => {
        const offer = offers.data.find(o => o.zones === value)
        return <label key={value} className={zone === value ? 'is-selected' : ''}>
          <input autoFocus={zone === value} type="radio" name={id} value={value} checked={zone === value} disabled={!offer} onChange={() => { setZone(value); save.reset() }} />
          <span><strong>{value === 'gym' ? copy.gymZone : copy.poolZone}</strong><small>{offer ? money(offer.price_byn, locale) : copy.unavailableZone}</small></span>
        </label>
      })}</div>}
    </fieldset>
    <p id={id + '-note'} className="text-muted-foreground">{copy.zoneEditNote}</p>
    <CommerceError error={save.error} />
    {save.error instanceof ApiError && ['price_changed', 'offer_unavailable'].includes(save.error.code) && <Button type="button" variant="outline" disabled={offers.isFetching} onClick={() => { save.reset(); void offers.refetch() }}>{copy.refreshTrainingPrices}</Button>}
    {save.error instanceof ApiError && save.error.code === 'cart_changed' && <Button type="button" variant="outline" onClick={() => void reload().then(close)}>{copy.reloadCart}</Button>}
    <div className="commerce-actions"><Button type="submit" disabled={save.isPending || offers.isFetching || offers.isError || !selected}>{save.isPending ? copy.loading : copy.save}</Button><Button type="button" variant="ghost" disabled={save.isPending} onClick={close}>{copy.cancelEdit}</Button></div>
  </form>
}
