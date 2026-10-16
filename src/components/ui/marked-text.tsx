import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A sentence with some of its words marked (SLJ-146): the student's answer
// with what to fix, or the correct one with what was missing. `tone` is the
// whole text's (`answer` neutral, `solution` green); a marked piece says
// which: `wrong` in the answer, `missing` in the solution. Marked words are
// underlined too, so the colour isn't the only sign.
const markedTextVariants = cva(
  "w-fit max-w-full rounded-md border px-2.5 py-1 text-base whitespace-pre-wrap break-words",
  {
    variants: {
      tone: {
        answer: "border-border bg-muted/40 text-foreground",
        solution: "border-success/40 bg-success/10 text-foreground",
      },
    },
    defaultVariants: { tone: "answer" },
  }
)

const markedTextPieceVariants = cva("", {
  variants: {
    mark: {
      none: "",
      wrong: "rounded-sm bg-destructive/15 text-destructive underline decoration-wavy underline-offset-4",
      missing: "rounded-sm bg-success/20 font-semibold text-success underline underline-offset-4",
    },
  },
  defaultVariants: { mark: "none" },
})

function MarkedText({
  className,
  tone,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof markedTextVariants>) {
  return <p className={cn(markedTextVariants({ tone }), className)} data-slot="marked-text" data-tone={tone} {...props} />
}

function MarkedTextPiece({
  className,
  mark,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof markedTextPieceVariants>) {
  return (
    <span
      className={cn(markedTextPieceVariants({ mark }), className)}
      data-mark={mark}
      data-slot="marked-text-piece"
      {...props}
    />
  )
}

export { MarkedText, MarkedTextPiece }
