import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// An answer as marked in a test's summary (SLJ-140): `right` and `solution`
// green (the student's right answer, or the correct one shown for a wrong
// answer), `partial` orange (an exercise partly right), `wrong` red. The text
// says what it is too, beside it: the colour alone isn't the message.
const answerMarkVariants = cva(
  "inline-flex min-h-6 w-fit items-center rounded-md border px-2 py-0.5 text-sm font-medium break-words",
  {
    variants: {
      tone: {
        right: "border-success/40 bg-success/10 text-success",
        solution: "border-success/40 bg-success/10 text-success",
        partial: "border-orange/40 bg-orange/10 text-orange",
        wrong: "border-destructive/40 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      tone: "wrong",
    },
  }
)

function AnswerMark({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof answerMarkVariants>) {
  return (
    <span
      className={cn(answerMarkVariants({ tone }), className)}
      data-slot="answer-mark"
      data-tone={tone}
      {...props}
    />
  )
}

export { AnswerMark }
