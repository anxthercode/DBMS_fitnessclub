import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Palette } from 'lucide-react'

export function ThemeSwitch() {
  const { i18n } = useTranslation()
  const [orange, setOrange] = useState(() => document.documentElement.dataset.theme === 'orange')
  const ru = i18n.language !== 'en'
  const title = ru
    ? (orange ? 'Тема: оранжевая. Включить бирюзовую' : 'Тема: бирюзовая. Включить оранжевую')
    : (orange ? 'Theme: orange. Switch to turquoise' : 'Theme: turquoise. Switch to orange')
  function toggle() {
    const next = orange ? 'turquoise' : 'orange'
    document.documentElement.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'orange' ? '#24201E' : '#1F2833')
    setOrange(!orange)
    try {
      localStorage.setItem('northside-theme', next)
      localStorage.removeItem('forma-theme')
    } catch { /* The switch also works when storage is unavailable. */ }
  }
  return <button type="button" className="theme-switch" aria-label={ru ? 'Оранжевая тема' : 'Orange theme'}
    aria-pressed={orange} title={title} onClick={toggle}>
    <Palette size={20} aria-hidden="true" />
  </button>
}
