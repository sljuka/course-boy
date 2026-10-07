import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A small dot asking for attention, next to a menu item, over a button's
// corner, or after an explorer item. `warning` (amber): something to do
// (e.g. "your identity isn't backed up"); `destructive` (red): something
// missing (e.g. a title not written in one of the course's languages).
// Decorative: say what it means in the labelled element it marks, or a tooltip.
const indicatorDotVariants = cva("inline-block size-2 shrink-0 rounded-full ring-2 ring-sidebar", {
  variants: {
    tone: {
      warning: "bg-warning",
      destructive: "bg-destructive",
    },
  },
  defaultVariants: { tone: "warning" },
})

function IndicatorDot({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof indicatorDotVariants>) {
  return (
    <span
      aria-hidden="true"
      data-slot="indicator-dot"
      className={cn(indicatorDotVariants({ tone }), className)}
      {...props}
    />
  )
}

export { IndicatorDot }
