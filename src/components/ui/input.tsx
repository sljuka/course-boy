import * as React from 'react'
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from '@/lib/utils'

const inputVariants = cva(
  "flex w-full border border-stone-300 bg-white text-stone-950 transition-colors placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      align: {
        center: "text-center",
        left: "text-left",
      },
      uiSize: {
        default:
          "h-12 rounded-md px-3 py-2 text-base shadow-sm md:text-sm",
        sm: "h-8 rounded-md px-3 py-0 text-xs shadow-none",
      },
    },
    defaultVariants: {
      align: "left",
      uiSize: "default",
    },
  },
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ align, className, uiSize, type = 'text', ...props }, ref) => {
    return (
      <input
        className={cn(
          inputVariants({ align, uiSize }),
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
