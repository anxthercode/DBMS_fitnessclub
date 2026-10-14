import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(result.violations.map(v => ({ rule: v.id, elements: v.nodes.map(n => n.target) }))).toEqual([])
}

async function navigate(page: Page, path: string) {
  // Keep the in-memory session, just as React Router links do.
  await page.evaluate(path => { history.pushState(null, '', path); dispatchEvent(new PopStateEvent('popstate')) }, path)
  await expect(page.locator('main h1')).toHaveCount(1)
  await expect(page.locator('main [role="status"]')).toHaveCount(0)
}

for (const language of ['ru', 'en']) for (const theme of ['turquoise', 'orange']) {
  test(`acceptance: ${language}/${theme} public and account accessibility and reflow`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('northside.language', language)
      localStorage.setItem('northside-theme', theme)
    }, { language, theme })
    await page.goto('/login')
    for (const route of ['/', '/plans', '/trainers', '/schedule', '/cart', '/login', '/register', '/recover', '/missing']) {
      await page.setViewportSize({ width: testInfo.project.name === 'desktop' ? 1440 : 390, height: 900 })
      await navigate(page, route)
      await audit(page)
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: route + ' at ' + width }).toBe(true)
      }
    }
    await navigate(page, '/login')
    await page.getByRole('button', { name: language === 'ru' ? 'Заполнить демоданные' : 'Fill in demo details' }).click()
    await page.locator('main form button[type="submit"]').click()
    await expect(page).toHaveURL(/\/account$/)
    for (const section of ['', '/profile', '/memberships', '/orders', '/bookings', '/notifications']) {
      await page.setViewportSize({ width: testInfo.project.name === 'desktop' ? 1440 : 390, height: 900 })
      await navigate(page, '/account' + section)
      await audit(page)
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: section + ' at ' + width }).toBe(true)
      }
    }
    await page.setViewportSize({ width: testInfo.project.name === 'desktop' ? 1440 : 390, height: 900 })
    await navigate(page, '/account/memberships')
    await page.screenshot({ path: testInfo.outputPath(`${language}-${theme}-memberships.png`), fullPage: true })
  })
}

test('acceptance: keyboard skip, form errors and configuration remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/register')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Перейти к содержимому' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.locator('main form button[type="submit"]').click()
  await expect(page.getByLabel('Имя', { exact: true })).toBeFocused()
  await audit(page)
  await page.getByRole('button', { name: 'Оранжевая тема', exact: true }).click()
  await audit(page)
  await page.goto('/plans')
  const date = page.getByLabel('Дата начала', { exact: true })
  await date.fill('')
  await expect(date).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('button', { name: 'Добавить в корзину' })).toBeDisabled()
  await audit(page)
})

test('acceptance: rapid payment submission issues one access and preserves decline history', async ({ page }) => {
  await page.clock.install()
  await page.goto('/plans')
  await page.getByLabel('Дата начала', { exact: true }).fill('2099-04-05')
  await page.getByRole('button', { name: 'Добавить в корзину' }).click()
  await page.getByRole('link', { name: 'Войти для оформления' }).click()
  await page.getByRole('button', { name: 'Заполнить демоданные' }).click()
  await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
  await page.getByRole('button', { name: 'Создать заказ и перейти к оплате' }).click()
  await page.getByRole('radio', { name: 'Отказ оплаты', exact: true }).check()
  await page.clock.pauseAt(new Date())
  // Dispatch two clicks in one browser task to exercise the pre-render window.
  await page.getByRole('button', { name: 'Оплатить в деморежиме' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.locator('.payment-panel button').first()).toBeDisabled()
  await expect(page.getByRole('radio', { name: 'Успешная оплата', exact: true })).toBeDisabled()
  await page.clock.resume()
  await expect(page.locator('.attempt-row')).toHaveCount(1)
  await page.getByRole('radio', { name: 'Успешная оплата', exact: true }).check()
  await page.getByRole('button', { name: 'Повторить оплату', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByRole('link', { name: 'Купленный доступ 1' })).toBeVisible()
  await expect(page.locator('.attempt-row')).toHaveCount(2)
  await expect(page.getByRole('link', { name: /Купленный доступ/ })).toHaveCount(1)
  await audit(page)
})
