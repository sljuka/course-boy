import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex w-full cursor-pointer appearance-none items-center justify-center rounded-md border font-medium transition-[transform,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      appearance: {
        courseTile:
          "h-auto min-h-28 flex-col items-start justify-center gap-2 rounded-[2rem] border-2 px-5 py-5 text-left font-semibold shadow-none",
        default: '',
        squareTileMd:
          '!w-[9.75rem] h-[9.75rem] !min-w-[9.75rem] shrink-0 flex-col items-center justify-center gap-2 rounded-[2.1rem] border-2 px-3 text-center font-semibold shadow-none',
        squareTile:
          'aspect-square h-auto min-h-44 flex-col items-center justify-center gap-4 rounded-[2.75rem] border-2 text-center font-semibold shadow-none',
      },
      size: {
        sm: 'h-10 px-3 text-sm',
        md: 'h-12 px-4 text-sm',
        lg: 'h-14 px-6 text-base',
      },
      variant: {
        default:
          'border-blue-700 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(29,78,216,0.85),0_14px_30px_-16px_rgba(37,99,235,0.55)] hover:bg-blue-500 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-2px_0_rgba(30,64,175,0.78),0_18px_38px_-18px_rgba(37,99,235,0.62)] active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(30,64,175,0.32),0_8px_18px_-14px_rgba(37,99,235,0.42)]',
        secondary:
          'border-stone-200 bg-stone-100 text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(214,211,209,0.95),0_12px_28px_-18px_rgba(28,25,23,0.24)] hover:bg-stone-200',
      },
    },
    defaultVariants: {
      appearance: 'default',
      size: 'md',
      variant: 'default',
    },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

function Button({
  appearance,
  className,
  size,
  type = 'button',
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ appearance, className, size, variant }))}
      type={type}
      {...props}
    />
  )
}

export { Button, buttonVariants }
