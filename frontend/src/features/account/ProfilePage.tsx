import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, LoaderCircle, Mail } from 'lucide-react'
import { api } from '@/api'
import { ApiError, type User } from '@/api/types'
import { profileSchema, type ProfileValues } from '@/api/profile-schema'
import { Field } from '@/features/auth/form-fields'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const formValues = (user: User): ProfileValues => ({ first_name: user.first_name, last_name: user.last_name, phone: user.phone || '', locale: user.locale })

export function ProfilePage() {
  const user = useOutletContext<User>()
  return <ProfileForm key={user.id} user={user} />
}

function ProfileForm({ user }: { user: User }) {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: formValues(user) })
  const save = useMutation({
    mutationFn: (values: ProfileValues) => api.profile({ ...values, phone: values.phone || null }),
    onSuccess: updated => {
      // A late response must never restore a session after logout or change of user.
      if (client.getQueryData<User | null>(['session'])?.id !== user.id) return
      client.setQueryData(['session'], updated)
      reset(formValues(updated))
      void i18n.changeLanguage(updated.locale)
    },
    onError: error => {
      if (error instanceof ApiError && error.status === 401 && client.getQueryData<User | null>(['session'])?.id === user.id) client.setQueryData(['session'], null)
    },
  })

  return (
    <section>
      <h1 className="page-title">{t('profile.title')}</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{t('profile.subtitle')}</p>
      <form noValidate className="mt-8 rounded-md border border-border bg-card p-5 sm:p-8" onSubmit={handleSubmit(values => save.mutate(values))}>
        <fieldset disabled={save.isPending} className="min-w-0 space-y-6">
          <legend className="sr-only">{t('profile.title')}</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="profile-first-name" label={t('auth.firstName')} error={errors.first_name?.message}>
              <Input id="profile-first-name" autoComplete="given-name" required maxLength={80} aria-invalid={!!errors.first_name} aria-describedby={errors.first_name ? 'profile-first-name-error' : undefined} {...register('first_name')} />
            </Field>
            <Field id="profile-last-name" label={t('auth.lastName')} error={errors.last_name?.message}>
              <Input id="profile-last-name" autoComplete="family-name" required maxLength={80} aria-invalid={!!errors.last_name} aria-describedby={errors.last_name ? 'profile-last-name-error' : undefined} {...register('last_name')} />
            </Field>
          </div>
          <Field id="profile-phone" label={t('profile.phone')} error={errors.phone?.message}>
            <Input id="profile-phone" type="tel" autoComplete="tel" maxLength={32} aria-invalid={!!errors.phone} aria-describedby={'phone-hint' + (errors.phone ? ' profile-phone-error' : '')} {...register('phone')} />
            <p id="phone-hint" className="mt-2 text-xs leading-5 text-muted-foreground">{t('profile.phoneHint')}</p>
          </Field>
          <Field id="profile-locale" label={t('profile.language')} error={errors.locale?.message}>
            <select id="profile-locale" className="select w-full sm:max-w-xs" aria-describedby="locale-hint" {...register('locale')}>
              <option value="ru">Русский</option><option value="en">English</option>
            </select>
            <p id="locale-hint" className="mt-2 text-xs leading-5 text-muted-foreground">{t('profile.languageHint')}</p>
          </Field>
        </fieldset>
        {save.isError && <p role="alert" className="mt-5 text-sm leading-6 text-destructive">{t('error.' + (save.error instanceof ApiError ? save.error.code : 'unknown'), { defaultValue: t('error.unknown') })}</p>}
        {save.isSuccess && !isDirty && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" />{t('profile.saved')}</p>}
        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button type="submit" variant="dark" disabled={!isDirty || save.isPending}>{save.isPending && <LoaderCircle className="animate-spin" />}{t(save.isPending ? 'profile.saving' : 'profile.save')}</Button>
          <Button type="button" variant="outline" disabled={!isDirty || save.isPending} onClick={() => { reset(formValues(user)); save.reset() }}>{t('profile.discard')}</Button>
          {isDirty && <p className="text-xs text-muted-foreground">{t('profile.unsaved')}</p>}
        </div>
      </form>
      <div className="mt-6 flex items-start gap-4 rounded-md border border-border p-5 sm:p-7">
        <Mail className="mt-1 hidden size-5 shrink-0 text-muted-foreground sm:block" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{t('profile.accountData')}</h2>
          <p className="mt-2 break-all text-sm">{user.email}</p>
          <p className={'status-badge mt-3 ' + (user.email_verified_at ? 'bg-muted text-success' : 'bg-warning/10 text-warning')}>{t(user.email_verified_at ? 'profile.emailVerified' : 'profile.emailUnverified')}</p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">{t('profile.emailNote')}</p>
        </div>
      </div>
    </section>
  )
}
