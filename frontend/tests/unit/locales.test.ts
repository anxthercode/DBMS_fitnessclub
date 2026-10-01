import { expect, it } from 'vitest'
import ru from '../../src/locales/ru.json'
import en from '../../src/locales/en.json'

it('has matching Russian and English dictionary keys with non-empty translations', () => {
  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort())
  expect(Object.values(ru).every(value => value.trim().length > 0)).toBe(true)
  expect(Object.values(en).every(value => value.trim().length > 0)).toBe(true)
})
