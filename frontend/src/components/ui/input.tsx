import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn('flex h-12 w-full min-w-0 rounded-sm border border-input bg-background px-3.5 text-base outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className)} {...props} />
}
