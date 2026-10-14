import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import ru from '@/locales/ru.json'
import { ApiError } from '@/api/types'
import { CartPage } from '@/features/commerce/CartPage'
import { OfferPreview } from '@/features/memberships/OfferPreview'
import { createMockApi } from '@/api/mock/api'

describe('session failure recovery', () => {
  for (const Component of [CartPage, OfferPreview]) {
    it(`${Component.name} explains session failure and exposes retry instead of a permanent loading/disabled state`, async () => {
      // Preserve the already-failed request while rendering its recovery state.
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false } } })
      try {
        const i18n = createInstance()
        await i18n.init({ lng: 'ru', keySeparator: false, showSupportNotice: false, resources: { ru: { translation: ru } } })
        await client.fetchQuery({ queryKey: ['session'], queryFn: () => Promise.reject(new ApiError('network', 0)) }).catch(() => {})
        client.setQueryData(['access-offers'], await createMockApi({ latency: 0 }).offers())
        const html = renderToString(<I18nextProvider i18n={i18n}><QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider></I18nextProvider>)
        expect(html).toContain('role="alert"')
        expect(html).toContain(ru['common.retry'])
        expect(html).not.toContain('role="status"')
      } finally { client.clear() }
    })
  }
})
