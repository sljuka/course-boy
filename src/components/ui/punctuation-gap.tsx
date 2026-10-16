import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// One gap between words in a punctuation exercise (SLJ-145): a small inline
// slot the student clicks to place marks. Empty, it's a dashed slot; with
// marks, it shows them. After a check, `right` is green and `wrong` red.
const punctuationGapVariants = cva(
  "mx-0.5 inline-flex h-7 min-w-5 items-center justify-center rounded-sm px-0.5 align-middle font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted",
  {
    variants: {
      filled: {
        false: "border border-dashed border-muted-foreground/40",
        true: "border border-transparent bg-muted/60",
      },
      tone: {
        neutral: "",
        right: "border-success/50 bg-success/10 text-success",
        wrong: "border-destructive/50 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      filled: false,
      tone: "neutral",
    },
  }
)

function PunctuationGap({
  className,
  filled,
  tone,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof punctuationGapVariants>) {
  return (
    <button
      className={cn(punctuationGapVariants({ filled, tone }), className)}
      data-slot="punctuation-gap"
      data-tone={tone}
      type="button"
      {...props}
    />
  )
}

// A mark in the gap's palette (inside a menu item, which highlights it):
// the mark itself, big enough to read at a glance.
const punctuationMarkVariants = cva("flex min-w-6 items-center justify-center text-lg leading-none font-semibold")

function PunctuationMark({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(punctuationMarkVariants(), className)} data-slot="punctuation-mark" {...props} />
}

export { PunctuationGap, PunctuationMark }
