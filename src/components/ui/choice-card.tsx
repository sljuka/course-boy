import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// An answer the student picks by tapping it: a picture, or a short text, in
// a card that shows whether it's picked (SLJ-175, Listen and choose). Big
// enough for a young child's finger; a radio or checkbox for assistive tech
// (`role` and `aria-checked` from the caller).
const choiceCardVariants = cva(
  "group/choice-card relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 bg-card p-2 text-center text-base font-medium text-foreground transition-colors outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none",
  {
    variants: {
      picked: {
        false: "border-border hover:border-primary/50 hover:bg-muted/40",
        true: "border-primary bg-primary/10 shadow-sm",
      },
      kind: {
        picture: "aspect-square",
        text: "min-h-16 px-4",
      },
    },
    defaultVariants: { kind: "text", picked: false },
  }
)

function ChoiceCard({
  className,
  kind,
  picked,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof choiceCardVariants>) {
  return (
    <button
      type="button"
      data-slot="choice-card"
      data-picked={picked ? "" : undefined}
      className={cn(choiceCardVariants({ kind, picked }), className)}
      {...props}
    />
  )
}

function ChoiceCardImage({ className, ...props }: React.ComponentProps<"img">) {
  return (
    <img
      data-slot="choice-card-image"
      className={cn("size-full rounded-lg object-contain", className)}
      draggable={false}
      {...props}
    />
  )
}

// A row of choice cards that wraps: pictures in a grid sized for small screens.
function ChoiceCardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="choice-card-grid"
      className={cn("grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3", className)}
      {...props}
    />
  )
}

export { ChoiceCard, ChoiceCardGrid, ChoiceCardImage }
