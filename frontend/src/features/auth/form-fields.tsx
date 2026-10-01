import { useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {error && <p id={id + '-error'} role="alert" className="mt-2 text-xs leading-5 text-destructive">{t(error)}</p>}
    </div>
  )
}

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-12" />
      <button type="button" className="absolute top-0 right-0 flex size-12 items-center justify-center rounded-r text-muted-foreground hover:text-foreground"
        aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={visible} aria-controls={props.id}
        onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
