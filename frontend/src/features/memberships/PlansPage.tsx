import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { OfferPreview } from './OfferPreview'
import { useCart } from '@/features/commerce/hooks'
import { CommerceError, PurchaseSteps } from '@/features/commerce/shared'
import { Loading } from '@/components/feedback'

export function PlansPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const edit = params.get('edit')
  const cart = useCart()
  const item = cart.data?.items.find(i => i.id === edit)
  return <section className="container-shell page-section">
    <div className="page-intro"><h1 className="page-title">{t('plans.title')}</h1><p>{t('plans.subtitle')}</p></div>
    <PurchaseSteps step="selection" />
    {edit && cart.isPending ? <Loading /> : edit && !item ? <CommerceError error={cart.error || 'not_found'} /> : <OfferPreview key={item?.id || 'new'} item={item} version={cart.data?.version} />}
  </section>
}
