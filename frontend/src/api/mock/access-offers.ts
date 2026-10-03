import type { AccessOfferPreview } from '../types'

// Illustrative BYN prices for the non-purchasable Stage 1 composition.
// Combined-zone prices are catalogue entries, never the sum of two products.
export const accessOfferPreviews: AccessOfferPreview[] = [
  { format: 'membership', zones: 'gym', months: 1, price_byn: '80.00' },
  { format: 'membership', zones: 'pool', months: 1, price_byn: '90.00' },
  { format: 'membership', zones: 'both', months: 1, price_byn: '120.00' },
  { format: 'membership', zones: 'gym', months: 3, price_byn: '210.00' },
  { format: 'membership', zones: 'pool', months: 3, price_byn: '240.00' },
  { format: 'membership', zones: 'both', months: 3, price_byn: '320.00' },
  { format: 'membership', zones: 'gym', months: 12, price_byn: '720.00' },
  { format: 'membership', zones: 'pool', months: 12, price_byn: '840.00' },
  { format: 'membership', zones: 'both', months: 12, price_byn: '1080.00' },
  { format: 'single_visit', zones: 'gym', months: null, price_byn: '15.00' },
  { format: 'single_visit', zones: 'pool', months: null, price_byn: '20.00' },
  { format: 'single_visit', zones: 'both', months: null, price_byn: '28.00' },
]
