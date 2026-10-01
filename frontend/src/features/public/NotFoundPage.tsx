import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section className="container-shell py-24 text-center">
      <p className="eyebrow mb-5 text-muted-foreground">404 / FORMA</p>
      <h1 className="page-title">{t('notFound.title')}</h1>
      <p className="mt-5 text-muted-foreground">{t('notFound.text')}</p>
      <Button asChild className="mt-8"><Link to="/"><ArrowLeft />{t('common.back')}</Link></Button>
    </section>
  )
}
