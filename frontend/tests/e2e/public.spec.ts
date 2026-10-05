import { expect, test } from '@playwright/test'

test('public routes render in RU and EN without console errors or overflow', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const routes = ['/', '/plans', '/trainers', '/login', '/register', '/missing-page']
  for (const language of ['ru', 'en']) {
    for (const route of routes) {
      await page.goto(route)
      await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('main [role="status"]')).toHaveCount(0)
      await expect(page.getByRole('contentinfo')).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(overflow, route + ' horizontal overflow').toBe(false)
      if (route === '/') {
        await expect(page.locator('main img').first()).toBeVisible()
        expect(await page.locator('main img').first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
        const fonts = await page.evaluate(async () => {
          await document.fonts.ready
          return Array.from(document.fonts).filter(font => font.family === 'Manrope' && font.status === 'loaded').map(font => font.weight)
        })
        expect(fonts).toContain('400')
        expect(fonts).toContain('500')
      }
      await page.screenshot({ path: testInfo.outputPath(language + '-' + (route.slice(1) || 'home') + '.png'), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})

test('language survives reload and translates trainer names', async ({ page }) => {
  await page.goto('/trainers')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Artem Volkov' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Coaches' })).toBeVisible()
  await expect(page).toHaveTitle('Coaches — NORTHSIDE Fitness Club')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('plan selection is preserved across auth links without creating an order', async ({ page }) => {
  await page.goto('/register?plan=2')
  await expect(page).toHaveURL(/\/register\?plan=2$/)
  await expect(page.getByText('Выбранный абонемент')).toBeVisible()
  await page.locator('main').getByRole('link', { name: 'Войти', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?plan=2$/)
  await page.locator('main').getByRole('link', { name: 'Зарегистрироваться', exact: true }).click()
  await expect(page).toHaveURL(/\/register\?plan=2$/)
})

test('registration validates values, handles duplicates and supports logout/login', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click()
  await expect(page.locator('#first-name')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#first-name')).toBeFocused()
  await page.getByLabel('Имя', { exact: true }).fill('Тест')
  await page.getByLabel('Фамилия', { exact: true }).fill('Клиент')
  await page.getByLabel('Электронная почта').fill('client@northside.demo')
  await page.getByLabel('Пароль', { exact: true }).fill('NewTest123!')
  await page.getByLabel('Повторите пароль').fill('Mismatch123!')
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click()
  await expect(page.getByText('Пароли не совпадают')).toBeVisible()
  await page.getByLabel('Повторите пароль').fill('NewTest123!')
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('email')
  await page.getByLabel('Электронная почта').fill('new@northside.demo')
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Обзор кабинета', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Разделы кабинета' }).getByRole('link', { name: 'Мои абонементы' }).click()
  await expect(page.getByRole('heading', { name: 'Абонементов пока нет' })).toBeVisible()
  if (await page.getByRole('button', { name: 'Открыть меню' }).isVisible()) await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.getByRole('button', { name: 'Выйти', exact: true }).filter({ visible: true }).first().click()
  await expect(page.getByLabel('Электронная почта')).toBeVisible()
  await page.getByLabel('Электронная почта').fill('new@northside.demo')
  await page.getByLabel('Пароль', { exact: true }).fill('NewTest123!')
  await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
  await expect(page.getByRole('heading', { name: 'Мои абонементы' })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Электронная почта')).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

test('login handles invalid credentials and password visibility', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Заполнить демоданные' }).click()
  await page.getByRole('button', { name: 'Показать пароль', exact: true }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Скрыть пароль', exact: true }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  await page.getByLabel('Пароль', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
  await expect(page.getByRole('alert')).toContainText('Неверный')
  await page.getByRole('button', { name: 'Заполнить демоданные' }).click()
  await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
  await expect(page.getByRole('heading', { name: 'Обзор кабинета', exact: true })).toBeVisible()
})

test('mobile menu supports navigation, Escape and browser back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-specific navigation')
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await expect(page.getByRole('button', { name: 'Закрыть меню' })).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toBeFocused()
  await page.getByRole('button', { name: 'Открыть меню' }).click()
  await page.getByRole('navigation', { name: 'Мобильная навигация' }).getByRole('link', { name: 'Абонементы' }).click()
  await expect(page.getByRole('heading', { name: 'Абонементы' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute('aria-expanded', 'false')
  await page.goBack()
  await expect(page.locator('h1')).toHaveText('NORTHSIDEFitness Club')
})

test('narrow screens and invalid plan links remain usable', async ({ page }, testInfo) => {
  // 720 CSS px also checks reflow for a 1440 px window at 200% browser zoom.
  for (const width of [320, 720, 768]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/plans', '/trainers', '/login', '/register']) {
      await page.goto(route)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('main [role="status"]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(width + '-' + (route.slice(1) || 'home') + '.png'), fullPage: true })
    }
  }
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/register?plan=does-not-exist')
  await expect(page.getByText('Этот абонемент недоступен')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Создать аккаунт' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
