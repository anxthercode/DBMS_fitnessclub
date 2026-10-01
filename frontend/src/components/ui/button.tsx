// shadcn/ui Button, adapted to FORMA design tokens (MIT).
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const buttonVariants = cva('inline-flex max-w-full items-center justify-center gap-2 rounded-sm text-center text-sm leading-6 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', {
  variants: {
    variant: { default: 'bg-primary text-primary-foreground hover:bg-foreground', dark: 'bg-primary text-primary-foreground hover:bg-foreground', outline: 'border border-input bg-transparent hover:border-primary hover:text-primary', ghost: 'hover:bg-muted hover:text-primary', destructive: 'bg-destructive text-background hover:bg-foreground' },
    size: { default: 'min-h-11 px-4 py-2', sm: 'min-h-11 px-3 py-2 text-xs', lg: 'min-h-12 px-6 py-3 text-base', icon: 'size-11 shrink-0' },
  }, defaultVariants: { variant: 'default', size: 'default' },
})
export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
