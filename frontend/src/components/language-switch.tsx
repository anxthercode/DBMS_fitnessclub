import { useTranslation } from 'react-i18next'
export function LanguageSwitch() {
  const { i18n } = useTranslation()
  return <div className="flex items-center text-xs" role="group" aria-label="Language / Язык">
    {['ru', 'en'].map(lang => <button type="button" key={lang} lang={lang} aria-pressed={i18n.language === lang}
      className={'min-h-11 min-w-8 px-1.5 ' + (i18n.language === lang ? 'text-primary underline underline-offset-8' : 'hover:text-primary')}
      onClick={() => void i18n.changeLanguage(lang)}>{lang.toUpperCase()}</button>)}
  </div>
}
