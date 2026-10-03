import { expect, it } from 'vitest'
import ru from '../../src/locales/ru.json'
import en from '../../src/locales/en.json'
import { homeCopy } from '../../src/features/public/home-content'
import { offerCopy } from '../../src/features/memberships/offer-copy'

it('has matching Russian and English dictionary keys with non-empty translations', () => {
  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort())
  expect(Object.values(ru).every(value => value.trim().length > 0)).toBe(true)
  expect(Object.values(en).every(value => value.trim().length > 0)).toBe(true)
  for (const copy of [homeCopy, offerCopy]) {
    expect(Object.keys(copy.ru).sort()).toEqual(Object.keys(copy.en).sort())
    for (const locale of ['ru', 'en'] as const) {
      expect(Object.values(copy[locale]).filter(value => typeof value === 'string').every(value => value.trim().length > 0)).toBe(true)
    }
  }
})
