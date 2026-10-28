import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const language of ['ru', 'en']) {
  test(`staff sections remain accessible and usable at desktop and 320px (${language})`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('browser-admin@example.com')
    await page.getByLabel('Пароль', { exact: true }).fill('Browser-test-2026!')
    await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    if (language === 'en') await page.getByRole('button', { name: 'EN', exact: true }).click()
    await page.evaluate(theme => { localStorage.setItem('northside-theme', theme) }, language === 'en' ? 'orange' : 'turquoise')
    for (const section of ['first-visits', 'bookings', 'passes', 'users', 'trainers', 'offers', 'training-offers', 'orders', 'access', 'discounts', 'rates', 'reports', 'exchange', 'profile', 'notifications']) {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto('/admin?section=' + section)
      await expect(page.locator('.staff-content')).toBeVisible()
      await expect(page.locator('.staff-content [role=status]')).toHaveCount(0)
      await expect(page.locator('.staff-content [role=alert]')).toHaveCount(0)
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(result.violations.map(v => ({ rule: v.id, nodes: v.nodes.map(n => n.target) })), section).toEqual([])
      await page.setViewportSize({ width: 320, height: 850 })
      await expect(page.locator('.staff-mobile-nav select')).toHaveValue(section)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), section).toBe(true)
    }
    await page.locator('.staff-mobile-nav select').selectOption('exchange')
    await expect(page).toHaveURL(/section=exchange/)
    await page.screenshot({ path: testInfo.outputPath('staff-' + language + '-320.png'), fullPage: true })
    expect(errors).toEqual([])
  })
}
