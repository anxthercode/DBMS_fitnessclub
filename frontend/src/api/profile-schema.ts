import { z } from 'zod'

const name = z.string().trim().min(1, 'auth.required').max(80, 'auth.nameTooLong')

// Shared by the form and the mock boundary. Only editable profile fields are accepted.
export const profileSchema = z.object({
  first_name: name,
  last_name: name,
  phone: z.string().trim().max(32, 'profile.phoneInvalid').refine(value => {
    if (!value) return true
    const digits = value.replace(/\D/g, '')
    return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
  }, 'profile.phoneInvalid'),
  locale: z.enum(['ru', 'en']),
})

export type ProfileValues = z.infer<typeof profileSchema>
