import { z } from 'zod'

const email = z.string().trim().min(1, 'auth.required').max(254, 'auth.emailInvalid').email('auth.emailInvalid')
const name = z.string().trim().min(1, 'auth.required').max(80, 'auth.nameTooLong')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth.required').max(128, 'auth.passwordTooLong'),
})

export const registerSchema = z.object({
  first_name: name,
  last_name: name,
  email,
  password: z.string().min(8, 'auth.passwordInvalid').max(128, 'auth.passwordTooLong').refine(value => value.trim().length > 0, 'auth.passwordInvalid'),
  confirm_password: z.string().min(1, 'auth.required'),
}).refine(values => values.password === values.confirm_password, {
  message: 'auth.passwordMismatch', path: ['confirm_password'],
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
