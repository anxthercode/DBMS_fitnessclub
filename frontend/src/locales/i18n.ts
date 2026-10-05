import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './ru.json'
import en from './en.json'

let language = 'ru'
try {
  const current = localStorage.getItem('northside.language')
  const legacy = current === null ? localStorage.getItem('forma.language') : null
  language = (current ?? legacy) === 'en' ? 'en' : 'ru'
  if (current === null && (legacy === 'en' || legacy === 'ru')) {
    try {
      localStorage.setItem('northside.language', legacy)
      localStorage.removeItem('forma.language')
    } catch { /* The readable preference also works when migration cannot be saved. */ }
  }
} catch { /* Storage is optional. */ }

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  supportedLngs: ['ru', 'en'], keySeparator: false, lng: language,
  fallbackLng: 'ru', interpolation: { escapeValue: false },
})

i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem('northside.language', lng)
    localStorage.removeItem('forma.language')
  } catch { /* Storage is optional. */ }
})
document.documentElement.lang = language
export default i18n
