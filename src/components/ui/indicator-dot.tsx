import * as React from "react"

import { cn } from "@/lib/utils"

// A small dot asking for attention (e.g. "your identity isn't backed up"),
// next to a menu item or over a button's corner. Decorative: say what it
// means in the labelled element it marks.
function IndicatorDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="indicator-dot"
      className={cn("inline-block size-2 shrink-0 rounded-full bg-warning ring-2 ring-sidebar", className)}
      {...props}
    />
  )
}

export { IndicatorDot }
