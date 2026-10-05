import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

function storage(initial: Record<string, string> = {}, writable = true) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (!writable) throw new Error('Storage is read-only')
      values.set(key, value)
    },
    removeItem: (key: string) => values.delete(key),
  }
}

function loadTheme(localStorage: ReturnType<typeof storage> | undefined) {
  const document = {
    documentElement: { dataset: { theme: '' } },
    querySelector: () => ({ setAttribute: vi.fn() }),
  }
  runInNewContext(readFileSync(new URL('../../public/theme-init.js', import.meta.url), 'utf8'), { document, localStorage })
  return document.documentElement.dataset.theme
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('theme preference after the club rename', () => {
  it('migrates the previous theme before painting and removes the old key only after saving', () => {
    const saved = storage({ 'forma-theme': 'orange' })
    expect(loadTheme(saved)).toBe('orange')
    expect(saved.getItem('northside-theme')).toBe('orange')
    expect(saved.getItem('forma-theme')).toBeNull()
  })

  it('gives a current preference priority over the old brand preference', () => {
    expect(loadTheme(storage({ 'northside-theme': 'turquoise', 'forma-theme': 'orange' }))).toBe('turquoise')
  })

  it('keeps a readable legacy theme when migration writes are blocked', () => {
    const saved = storage({ 'forma-theme': 'orange' }, false)
    expect(loadTheme(saved)).toBe('orange')
    expect(saved.getItem('forma-theme')).toBe('orange')
    expect(saved.getItem('northside-theme')).toBeNull()
  })

  it('uses the default theme when storage cannot be read', () => {
    expect(loadTheme(undefined)).toBe('turquoise')
  })
})

describe('language preference after the club rename', () => {
  async function loadLanguage(saved: ReturnType<typeof storage> | undefined) {
    vi.stubGlobal('localStorage', saved)
    vi.stubGlobal('document', { documentElement: { lang: '' } })
    return (await import('../../src/locales/i18n')).default
  }

  it('migrates the previous language and saves later changes under the new brand', async () => {
    const saved = storage({ 'forma.language': 'en' })
    const i18n = await loadLanguage(saved)
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(saved.getItem('northside.language')).toBe('en')
    expect(saved.getItem('forma.language')).toBeNull()
    await i18n.changeLanguage('ru')
    expect(saved.getItem('northside.language')).toBe('ru')
  })

  it('keeps the current language when an old preference remains', async () => {
    const i18n = await loadLanguage(storage({ 'northside.language': 'ru', 'forma.language': 'en' }))
    expect(i18n.language).toBe('ru')
  })

  it('keeps a readable legacy language when migration writes are blocked', async () => {
    const saved = storage({ 'forma.language': 'en' }, false)
    const i18n = await loadLanguage(saved)
    expect(i18n.language).toBe('en')
    expect(saved.getItem('forma.language')).toBe('en')
    await expect(i18n.changeLanguage('ru')).resolves.toBeTypeOf('function')
  })

  it('supports language changes when browser storage is unavailable', async () => {
    const i18n = await loadLanguage(undefined)
    expect(i18n.language).toBe('ru')
    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
