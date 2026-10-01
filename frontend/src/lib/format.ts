import type { Locale, Money } from '@/api/types'
export const clubTimezone = 'Europe/Minsk'
export const money = (value: Money, locale: string = 'ru', currency = 'BYN') => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value))
export const date = (value: string, locale = 'ru', options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat(locale, { ...options, timeZone: clubTimezone }).format(new Date(value))
export const time = (value: string, locale = 'ru') => date(value, locale, { hour: '2-digit', minute: '2-digit', hour12: false })
export const localDay = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: clubTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
export function localized(value: object, field: string, locale: string): string { return String((value as Record<string, unknown>)[`${field}_${locale === 'en' ? 'en' : 'ru'}`] || '') }
export const asLocale = (value: string): Locale => value === 'en' ? 'en' : 'ru'
