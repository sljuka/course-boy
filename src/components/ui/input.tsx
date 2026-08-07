import * as React from 'react'

import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        className={cn(
          'flex h-12 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 shadow-sm transition-colors placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'

export { Input }
