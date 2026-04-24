import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Cream light-mode canonical: ink on paper with warm border.
        default: 'bg-background-card text-text-primary border border-border hover:bg-background-elevated',
        // Brand-amber action — white text on amber for WCAG AA contrast.
        primary: 'bg-accent text-text-primary hover:bg-accent-hover',
        destructive: 'bg-risk-critical text-text-primary hover:bg-risk-critical/90',
        outline: 'border border-border bg-transparent hover:bg-background-elevated hover:text-text-primary',
        secondary: 'bg-background-elevated text-text-primary hover:bg-background-elevated/80',
        // Ghost — fully transparent, no bg until hover.
        ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-background-elevated',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-sm px-3 text-xs',
        lg: 'h-10 rounded-sm px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
