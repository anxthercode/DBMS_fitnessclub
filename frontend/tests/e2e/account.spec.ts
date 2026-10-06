import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email = 'client@northside.demo') {
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill('Northside2026!')
  await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
}

async function signOut(page: Page) {
  if (await page.getByRole('button', { name: 'Открыть меню' }).isVisible()) await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.getByRole('button', { name: 'Выйти', exact: true }).filter({ visible: true }).first().click()
}

test('guest is redirected to sign-in and returned to the requested profile', async ({ page }) => {
  await page.goto('/account/profile')
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fprofile$/)
  await expect(page.getByRole('navigation', { name: 'Разделы кабинета' })).toHaveCount(0)
  await signIn(page)
  await expect(page).toHaveURL(/\/account\/profile$/)
  await expect(page.getByLabel('Имя', { exact: true })).toHaveValue('Александра')
  await page.reload()
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fprofile$/)
  await expect(page.getByLabel('Электронная почта')).toBeVisible()
})

test('memberships show states, dates, filters and localized responsive account pages', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/account/memberships')
  await signIn(page)
  await expect(page.locator('main article').filter({ has: page.locator('time') })).toHaveCount(4)
  for (const status of ['Активен', 'Начнётся позже', 'Завершён', 'Отменён']) await expect(page.locator('main article').filter({ has: page.locator('time') }).getByText(status, { exact: true })).toBeVisible()
  await expect(page.getByText('Ритм', { exact: true })).toHaveCount(2)
  await expect(page.locator('main time')).toHaveCount(8)
  for (const label of ['Не использовано', 'Использовано', 'Истекло', 'Отменён']) await expect(page.locator('.pass-list .status-badge').filter({ hasText: new RegExp('^' + label + '$') })).toHaveCount(1)
  await page.getByRole('button', { name: 'Текущие и будущие' }).click()
  await expect(page.locator('main article').filter({ has: page.locator('time') })).toHaveCount(2)
  await page.getByRole('button', { name: 'История' }).click()
  await expect(page.locator('main article').filter({ has: page.locator('time') })).toHaveCount(2)
  await expect(page.getByText('Активен', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Все', exact: false }).click()

  for (const locale of ['ru', 'en']) {
    await page.getByRole('button', { name: locale.toUpperCase(), exact: true }).click()
    for (const section of ['memberships', 'profile']) {
      const label = section === 'profile' ? (locale === 'ru' ? 'Профиль' : 'Profile') : (locale === 'ru' ? 'Мои абонементы' : 'My memberships')
      await page.getByRole('navigation', { name: locale === 'ru' ? 'Разделы кабинета' : 'Account navigation' }).getByRole('link', { name: label }).click()
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('main [role="status"]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(locale + '-' + section + '.png'), fullPage: true, animations: 'disabled' })
    }
  }
  for (const width of [320, 720, 768]) {
    await page.setViewportSize({ width, height: 900 })
    for (const label of ['My memberships', 'Profile']) {
      await page.getByRole('navigation', { name: 'Account navigation' }).getByRole('link', { name: label }).click()
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('main [role="status"]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(width + '-' + label + '.png'), fullPage: true, animations: 'disabled' })
    }
  }
  expect(errors).toEqual([])
})

test('profile validates, discards edits and saves contact details and language', async ({ page }) => {
  await page.goto('/account/profile')
  await signIn(page)
  const firstName = page.getByLabel('Имя', { exact: true })
  const phone = page.getByLabel('Телефон (необязательно)')
  await expect(page.getByRole('button', { name: 'Сохранить изменения' })).toBeDisabled()
  await firstName.fill('   ')
  await phone.fill('invalid')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(firstName).toHaveAttribute('aria-invalid', 'true')
  await expect(phone).toHaveAttribute('aria-invalid', 'true')
  await expect(firstName).toBeFocused()
  await page.getByRole('button', { name: 'Отменить изменения' }).click()
  await expect(firstName).toHaveValue('Александра')
  await expect(phone).toHaveValue('+375 29 555-01-20')
  await firstName.fill('  Новое имя  ')
  await phone.fill('')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page.getByRole('status')).toHaveText('Профиль сохранён')
  await expect(firstName).toHaveValue('Новое имя')
  await page.getByLabel('Язык интерфейса').selectOption('en')
  await page.getByRole('button', { name: 'Сохранить изменения' }).click()
  await expect(page.getByRole('status')).toHaveText('Profile saved')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByText('Новое имя Миронова', { exact: true })).toBeVisible()
  await expect(page.getByText('client@northside.demo', { exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Account navigation' }).getByRole('link', { name: 'My memberships' }).click()
  await page.getByRole('navigation', { name: 'Account navigation' }).getByRole('link', { name: 'Profile', exact: true }).click()
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Новое имя')
  await expect(page.getByLabel('Phone (optional)')).toHaveValue('')
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['northside.language'])
})

test('logout prevents back-navigation leaks and changing clients isolates membership data', async ({ page }) => {
  await page.goto('/account/memberships')
  await signIn(page)
  await expect(page.locator('main article').filter({ has: page.locator('time') })).toHaveCount(4)
  await page.getByRole('navigation', { name: 'Разделы кабинета' }).getByRole('link', { name: 'Профиль' }).click()
  await signOut(page)
  await expect(page.getByLabel('Электронная почта')).toBeVisible()
  await page.goBack()
  await expect(page.getByLabel('Электронная почта')).toBeVisible()
  await expect(page.getByText('Александра Миронова', { exact: true })).toHaveCount(0)
  await signIn(page, 'max@northside.demo')
  await expect(page.getByRole('navigation', { name: 'Разделы кабинета' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Разделы кабинета' }).getByRole('link', { name: 'Мои абонементы' }).click()
  await expect(page.locator('main article').filter({ has: page.locator('time') })).toHaveCount(1)
  await expect(page.getByText('Максим Орлов', { exact: true })).toBeVisible()
  await expect(page.getByText('Абонемент № 2', { exact: true })).toBeVisible()
})

test('trainer cannot render the client area and external redirects are ignored', async ({ page }) => {
  await page.goto('/login?redirect=https://example.com')
  await signIn(page)
  await expect(page).toHaveURL(/\/account$/)
  await signOut(page)
  await signIn(page, 'trainer@northside.demo')
  await expect(page.getByRole('heading', { name: 'Вы вошли, Даниэль' })).toBeVisible()
  // Simulate an internal deep link without reloading the in-memory mock session.
  await page.evaluate(() => {
    history.pushState(null, '', '/account/profile')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('heading', { name: 'Кабинет доступен клиентам' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Разделы кабинета' })).toHaveCount(0)
  await expect(page.locator('main form')).toHaveCount(0)
})
