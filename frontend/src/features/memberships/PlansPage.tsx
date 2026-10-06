import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { selectionFromParams } from './purchase-link'
import { OfferPreview } from './OfferPreview'
import { useCart } from '@/features/commerce/hooks'
import { CommerceError, PurchaseSteps } from '@/features/commerce/shared'
import { Loading } from '@/components/feedback'

export function PlansPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const initial = selectionFromParams(params)
  const edit = params.get('edit')
  const cart = useCart()
  const item = cart.data?.items.find(i => i.id === edit)
  return <section className="container-shell page-section">
    <div className="page-intro"><h1 className="page-title">{t('plans.title')}</h1><p>{t('plans.subtitle')}</p></div>
    <PurchaseSteps step="selection" />
    {initial && ['again', 'renew'].includes(params.get('repeat') || '') && <p className="commerce-intro">{t(params.get('repeat') === 'renew' ? 'plans.renewNote' : 'plans.repeatNote')}</p>}
    {edit && cart.isPending ? <Loading /> : edit && !item ? <CommerceError error={cart.error || 'not_found'} /> : <OfferPreview key={item?.id || params.toString() || 'new'} initial={initial} item={item} version={cart.data?.version} />}
  </section>
}
