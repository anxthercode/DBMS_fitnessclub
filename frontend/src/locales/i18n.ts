import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './ru.json'
import en from './en.json'

let language = 'ru'
try { language = localStorage.getItem('forma.language') === 'en' ? 'en' : 'ru' } catch { /* Storage is optional. */ }

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  supportedLngs: ['ru', 'en'], keySeparator: false, lng: language,
  fallbackLng: 'ru', interpolation: { escapeValue: false },
})

i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng
  try { localStorage.setItem('forma.language', lng) } catch { /* Storage is optional. */ }
})
document.documentElement.lang = language
export default i18n
