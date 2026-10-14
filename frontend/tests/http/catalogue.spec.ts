import { expect, test } from '@playwright/test'
import type { Offer } from '../../src/api/commerce-types'
import { money } from '../../src/lib/format'

test('PostgreSQL catalogue appears in both languages and adds to a persistent guest cart', async ({ page, request }) => {
  const response = await request.get('http://127.0.0.1:8001/api/v1/access-offers')
  expect(response.ok()).toBeTruthy()
  const offers = await response.json() as Offer[]
  const selected = offers.find(offer => offer.zones === 'both' && offer.months === 3)!
  expect(selected).toBeDefined()
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/api/v1/')) requests.push(request.url()) })
  await page.goto('/plans')
  await expect(page.locator('.offer-total')).toHaveText(money(selected.price_byn, 'ru'))
  await expect(page.getByRole('button', { name: 'Добавить в корзину' })).toBeEnabled()
  await expect(page.locator('.offer-summary')).toContainText('Персональные тренировки оплачиваются отдельно.')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('.offer-total')).toHaveText(money(selected.price_byn, 'en'))
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.locator('.commerce-items .commerce-card')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.commerce-items .commerce-card')).toHaveCount(1)
  expect(requests.some(url => url.endsWith('/cart'))).toBe(true)
})

test('API failure shows retry without silently substituting demo prices', async ({ page }) => {
  await page.route('**/api/v1/access-offers', route => route.fulfill({
    status: 503, contentType: 'application/json', body: '{"code":"database_unavailable"}',
  }))
  await page.goto('/plans')
  await expect(page.locator('.offer-summary').getByRole('alert')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.offer-total')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Добавить в корзину' })).toBeDisabled()
  await page.unroute('**/api/v1/access-offers')
  await page.locator('.offer-summary').getByRole('alert').getByRole('button').click()
  await expect(page.locator('.offer-total')).toBeVisible()
})
