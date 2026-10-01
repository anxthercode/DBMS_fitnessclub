import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { api, isMock } from '@/api'
import { ApiError, type LoginInput, type RegisterInput } from '@/api/types'
import { demoAccounts, demoPassword } from '@/api/mock/demo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loading, QueryError } from '@/components/feedback'
import { asLocale, localized, money } from '@/lib/format'
import { useSession } from './session'
import { accountDestination } from './redirect'
import { Field, PasswordInput } from './form-fields'
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from './schemas'

function useAuthMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (values: LoginInput | RegisterInput) => 'first_name' in values ? api.register(values) : api.login(values),
    onSuccess: async user => {
      await client.cancelQueries({ queryKey: ['session'] })
      await client.cancelQueries({ queryKey: ['account'] })
      client.removeQueries({ queryKey: ['account'] })
      client.setQueryData(['session'], user)
    },
  })
}

function SubmitError({ error }: { error: Error | null }) {
  const { t } = useTranslation()
  if (!error) return null
  return <p role="alert" className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm leading-6 text-destructive">{t('error.' + (error instanceof ApiError ? error.code : 'unknown'), { defaultValue: t('error.unknown') })}</p>
}

function LoginForm() {
  const { t } = useTranslation()
  const mutation = useAuthMutation()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit(values => mutation.mutate(values))}>
      <Field id="email" label={t('auth.email')} error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} autoCapitalize="none" spellCheck={false} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
      </Field>
      <Field id="password" label={t('auth.password')} error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" required maxLength={128} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
      </Field>
      <SubmitError error={mutation.error} />
      <Button type="submit" className="w-full" size="lg" variant="dark" disabled={mutation.isPending}>
        {mutation.isPending && <LoaderCircle className="animate-spin" />}{t(mutation.isPending ? 'auth.submitting' : 'auth.signIn')}<ArrowUpRight />
      </Button>
      {isMock && <div className="rounded border border-border bg-background p-4 text-xs leading-6 text-muted-foreground">
        <p className="font-semibold text-foreground">{t('auth.demoTitle')}</p>
        <p className="mt-1 break-all">{demoAccounts.CLIENT} / {demoPassword}</p>
        <button type="button" className="mt-2 min-h-11 text-left font-semibold text-foreground underline underline-offset-4" onClick={() => {
          setValue('email', demoAccounts.CLIENT, { shouldValidate: true })
          setValue('password', demoPassword, { shouldValidate: true })
        }}>{t('auth.fillDemo')}</button>
      </div>}
    </form>
  )
}

function RegisterForm() {
  const { t, i18n } = useTranslation()
  const mutation = useAuthMutation()
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '', confirm_password: '' },
  })
  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit(({ confirm_password: _confirmation, ...values }) => mutation.mutate({ ...values, locale: asLocale(i18n.language) }))}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="first-name" label={t('auth.firstName')} error={errors.first_name?.message}>
          <Input id="first-name" autoComplete="given-name" required maxLength={80} aria-invalid={!!errors.first_name} aria-describedby={errors.first_name ? 'first-name-error' : undefined} {...register('first_name')} />
        </Field>
        <Field id="last-name" label={t('auth.lastName')} error={errors.last_name?.message}>
          <Input id="last-name" autoComplete="family-name" required maxLength={80} aria-invalid={!!errors.last_name} aria-describedby={errors.last_name ? 'last-name-error' : undefined} {...register('last_name')} />
        </Field>
      </div>
      <Field id="email" label={t('auth.email')} error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} autoCapitalize="none" spellCheck={false} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
      </Field>
      <Field id="password" label={t('auth.password')} error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="new-password" required maxLength={128} aria-invalid={!!errors.password} aria-describedby={'password-hint' + (errors.password ? ' password-error' : '')} {...register('password')} />
        <p id="password-hint" className="mt-2 text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
      </Field>
      <Field id="confirm-password" label={t('auth.confirmPassword')} error={errors.confirm_password?.message}>
        <PasswordInput id="confirm-password" autoComplete="new-password" required maxLength={128} aria-invalid={!!errors.confirm_password} aria-describedby={errors.confirm_password ? 'confirm-password-error' : undefined} {...register('confirm_password')} />
      </Field>
      <SubmitError error={mutation.error} />
      <Button type="submit" className="w-full" size="lg" variant="dark" disabled={mutation.isPending}>
        {mutation.isPending && <LoaderCircle className="animate-spin" />}{t(mutation.isPending ? 'auth.submitting' : 'auth.signUp')}<ArrowUpRight />
      </Button>
    </form>
  )
}

function SelectedPlan({ id }: { id: string }) {
  const { t, i18n } = useTranslation()
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.plans })
  if (plans.isPending) return <Loading />
  if (plans.isError) return <QueryError retry={() => void plans.refetch()} />
  const plan = plans.data.find(item => item.id === id && item.is_active)
  return <div className="mb-7 rounded border border-border bg-background p-4 text-sm">
    <p className="text-xs text-muted-foreground">{t('auth.selectedPlan')}</p>
    <p className="mt-2 font-semibold">{plan ? localized(plan, 'name', i18n.language) + ' · ' + money(plan.price_byn, i18n.language) + ' / ' + t('plans.months' + plan.duration_months) : t('auth.planUnavailable')}</p>
    <Link to="/plans" className="mt-2 inline-block text-xs underline underline-offset-4">{t('auth.changePlan')}</Link>
  </div>
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useTranslation()
  const session = useSession()
  const [params] = useSearchParams()
  const selectedId = params.get('plan')
  const destination = accountDestination(params.get('redirect'))
  const nextParams = new URLSearchParams()
  if (selectedId) nextParams.set('plan', selectedId)
  if (params.has('redirect')) nextParams.set('redirect', destination)
  const suffix = nextParams.size ? '?' + nextParams.toString() : ''
  const isRegister = mode === 'register'

  if (session.data?.role === 'CLIENT') return <Navigate to={destination} replace />

  return (
    <section className="container-shell pt-9 sm:pt-14">
      <div className="mx-auto max-w-[600px] rounded-md border border-border bg-card">
        <div className="px-5 py-7 sm:p-10">
          <div className="mx-auto max-w-md">
            <h1 className="page-title">{t('auth.' + mode)}</h1>
            <p className="mt-3 mb-7 text-sm leading-6 text-muted-foreground">{t('auth.' + mode + 'Sub')}</p>
            {selectedId && <SelectedPlan id={selectedId} />}
            {session.isPending ? <Loading /> : session.isError ? <QueryError retry={() => void session.refetch()} /> : session.data ? (
              <div role="status" className="rounded-md border border-border bg-muted/50 p-6">
                <CheckCircle2 className="mb-4 size-8 text-success" />
                <h2 className="text-xl font-semibold">{t('auth.signedIn', { name: session.data.first_name })}</h2>
                <p className="mt-3 break-all text-sm text-muted-foreground">{session.data.email}</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{t('auth.successNote')}</p>
                <Button asChild className="mt-6"><Link to="/">{t('common.back')}<ArrowUpRight /></Link></Button>
              </div>
            ) : <>
              {isRegister ? <RegisterForm /> : <LoginForm />}
              <p className="mt-6 text-center text-sm leading-7 text-muted-foreground">{t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
                <Link to={(isRegister ? '/login' : '/register') + suffix} className="font-semibold text-foreground underline underline-offset-4">{t(isRegister ? 'nav.login' : 'auth.create')}</Link>
              </p>
            </>}
            {isMock && <p className="mt-6 text-xs leading-6 text-muted-foreground">{t('auth.mockNote')}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
