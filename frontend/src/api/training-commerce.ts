import { request } from './http'
import type { Cart, PutCartItem, TrainingSelection } from './commerce-types'

export interface TrainingOffer { id: string; zones: 'gym' | 'pool'; price_byn: string; revision: number }
export const trainingOffers = () => request<TrainingOffer[]>('/training-offers')
export const putTrainingItem = (input: Omit<PutCartItem, 'selection'> & { selection: TrainingSelection }) => request<Cart>('/cart/items', 'PUT', input)
