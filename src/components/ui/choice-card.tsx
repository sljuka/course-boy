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
        // A row in a column of items to pair or sort (SLJ-176): a picture,
        // the same height in every card so a column lines up.
        pair: "h-20 flex-row px-3 sm:h-24",
        // Its text twin: at least as tall, growing with a long phrase instead
        // of cutting it off.
        pairText: "min-h-20 px-3 py-2 text-sm/snug sm:min-h-24",
      },
      wrong: {
        false: "",
        true: "border-destructive bg-destructive/5",
      },
      // Can be dragged (SLJ-178): touch moves the card, not the page.
      movable: {
        false: "",
        true: "cursor-grab touch-none",
      },
      // Following the pointer: drawn above the rest, and not in the way of
      // finding what it's dropped on.
      dragging: {
        false: "",
        true: "pointer-events-none z-10 cursor-grabbing shadow-lg",
      },
    },
    defaultVariants: { kind: "text", picked: false, wrong: false, movable: false, dragging: false },
  }
)

// Paired items share a colour (and a number, for those who can't tell the
// colours apart), told apart from the next pair's. None is orange or red:
// those are a picked item (primary) and a wrong pair (destructive).
const PAIR_TONES = [
  "border-sky-500 bg-sky-500/10",
  "border-violet-500 bg-violet-500/10",
  "border-emerald-500 bg-emerald-500/10",
  "border-fuchsia-500 bg-fuchsia-500/10",
  "border-lime-500 bg-lime-500/10",
  "border-indigo-500 bg-indigo-500/10",
  "border-teal-500 bg-teal-500/10",
  "border-yellow-500 bg-yellow-500/10",
]

const PAIR_BADGE_TONES = [
  "bg-sky-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-fuchsia-600",
  "bg-lime-700",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-yellow-700",
]

const pairTone = (tones: string[], pair: number) => tones[pair % tones.length]

function ChoiceCard({
  className,
  movable,
  dragging,
  kind,
  pair,
  picked,
  wrong,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof choiceCardVariants> & { pair?: number | null }) {
  const isPaired = pair !== undefined && pair !== null
  return (
    <button
      type="button"
      data-slot="choice-card"
      data-picked={picked ? "" : undefined}
      data-pair={isPaired ? pair : undefined}
      className={cn(
        choiceCardVariants({ movable, dragging, kind, picked, wrong }),
        isPaired && !picked && !wrong && pairTone(PAIR_TONES, pair),
        className
      )}
      {...props}
    />
  )
}

const choiceCardBadgeVariants = cva(
  "absolute top-1 left-1 flex items-center justify-center rounded-full font-semibold tabular-nums",
  {
    variants: {
      size: {
        sm: "size-6 text-xs",
        // A place in an order (SLJ-177): big enough to read from a distance.
        lg: "size-9 text-lg",
      },
      tone: {
        muted: "bg-muted text-muted-foreground",
        primary: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { size: "sm", tone: "muted" },
  }
)

// A number in the card's corner: a pair's, in the pair's colour, or a place
// in an order.
function ChoiceCardBadge({
  className,
  pair,
  size,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof choiceCardBadgeVariants> & { pair?: number | null }) {
  const isPaired = pair !== undefined && pair !== null
  return (
    <span
      data-slot="choice-card-badge"
      className={cn(
        choiceCardBadgeVariants({ size, tone }),
        isPaired && cn("text-white", pairTone(PAIR_BADGE_TONES, pair)),
        className
      )}
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

// On paper: a pair's number or letter beside its item, and the box the
// student writes a partner's letter in.
function ChoiceCardMarker({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choice-card-marker"
      className={cn("w-6 shrink-0 text-right font-semibold tabular-nums", className)}
      {...props}
    />
  )
}

function ChoiceCardAnswerBox({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choice-card-answer-box"
      className={cn("size-8 shrink-0 rounded border border-foreground", className)}
      {...props}
    />
  )
}

// A group cards are sorted into (SLJ-178): its name on top, its cards below.
// `ready`: a card is picked, so tapping the group puts it there.
const choiceBoxVariants = cva(
  "flex min-h-40 flex-col gap-3 rounded-xl border-2 border-dashed p-3 transition-colors motion-reduce:transition-none",
  {
    variants: {
      ready: {
        false: "border-border bg-muted/20",
        true: "cursor-pointer border-primary/70 bg-primary/5",
      },
    },
    defaultVariants: { ready: false },
  }
)

function ChoiceBox({ className, ready, ...props }: React.ComponentProps<"div"> & VariantProps<typeof choiceBoxVariants>) {
  return <div data-slot="choice-box" className={cn(choiceBoxVariants({ ready }), className)} {...props} />
}

function ChoiceBoxTitle({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="choice-box-title"
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-2 py-1 text-center text-base font-semibold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

// Groups side by side, stacked on small screens.
function ChoiceBoxes({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="choice-boxes"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]", className)}
      {...props}
    />
  )
}

// Two columns side by side, for items to pair (SLJ-176).
function ChoiceCardColumns({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="choice-card-columns"
      className={cn("grid max-w-2xl grid-cols-2 gap-x-6 gap-y-3 sm:gap-x-12", className)}
      {...props}
    />
  )
}

export {
  ChoiceBox,
  ChoiceBoxes,
  ChoiceBoxTitle,
  ChoiceCard,
  ChoiceCardAnswerBox,
  ChoiceCardBadge,
  ChoiceCardColumns,
  ChoiceCardGrid,
  ChoiceCardImage,
  ChoiceCardMarker,
}
