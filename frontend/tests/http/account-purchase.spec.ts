import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'

test('registration without email verification, purchase, reload and login use PostgreSQL', async ({ page }) => {
  const email = `browser-${randomUUID()}@example.com`
  const password = 'Browser-test-2026!'
  await page.goto('/plans')
  await page.getByRole('button', { name: 'Добавить в корзину' }).click()
  await page.goto('/register?redirect=/cart')
  await page.getByLabel('Имя', { exact: true }).fill('Браузер')
  await page.getByLabel('Фамилия', { exact: true }).fill('Тест')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByLabel('Повторите пароль').fill(password)
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Создать заказ и перейти к оплате' }).click()
  await page.getByRole('button', { name: 'Оплатить в деморежиме' }).click()
  await expect(page.getByRole('link', { name: 'Купленный доступ 1' })).toBeVisible()
  await page.reload()
  await page.getByRole('link', { name: 'Купленный доступ 1' }).click()
  await expect(page.locator('main')).toContainText('Персональные тренировки оплачиваются отдельно')
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Войти в аккаунт' }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.locator('.account-metrics')).toContainText('1')
})
