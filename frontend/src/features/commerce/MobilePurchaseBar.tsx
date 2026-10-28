import type { ReactNode } from 'react'
import { money } from '@/lib/format'
import { useCommerceCopy } from './copy'
import './commerce.css'

export function MobilePurchaseBar({ amount, currency = 'BYN', label, children }: {
  amount?: string; currency?: 'BYN' | 'USD' | 'EUR'; label: string; children: ReactNode
}) {
  const { locale } = useCommerceCopy()
  return <div className="mobile-purchase-space"><div className="mobile-purchase-bar" data-testid="mobile-purchase-bar">
    <div className="mobile-purchase-price" aria-live="polite"><strong>{amount ? money(amount, locale, currency) : '—'}</strong><span>{label}</span></div>
    {children}
  </div></div>
}
