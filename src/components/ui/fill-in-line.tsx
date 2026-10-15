import * as React from "react"

import { cn } from "@/lib/utils"

// A label and a blank line after it, written on by hand on a printout
// ("Name: ________", SLJ-143). The line takes the rest of the row.
function FillInLine({
  className,
  label,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { label: string }) {
  return (
    <div
      className={cn("flex min-w-0 items-end gap-2 text-sm text-foreground", className)}
      data-slot="fill-in-line"
      {...props}
    >
      <span className="shrink-0">{label}</span>
      <span aria-hidden="true" className="h-6 min-w-0 flex-1 border-b border-foreground/60" />
    </div>
  )
}

// A blank inside a printed sentence, written in by hand (a missing-words
// exercise on paper): a line about as wide as a word or two.
function FillInBlank({ className, ...props }: Omit<React.ComponentProps<"span">, "children">) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-6 w-36 border-b border-foreground/60", className)}
      data-slot="fill-in-blank"
      {...props}
    />
  )
}

export { FillInBlank, FillInLine }
