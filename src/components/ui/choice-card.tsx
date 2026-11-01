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
        // A row in a column of items to pair (SLJ-176): short, picture or text.
        pair: "h-20 flex-row px-3 sm:h-24",
      },
      wrong: {
        false: "",
        true: "border-destructive bg-destructive/5",
      },
    },
    defaultVariants: { kind: "text", picked: false, wrong: false },
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
        choiceCardVariants({ kind, picked, wrong }),
        isPaired && !picked && !wrong && pairTone(PAIR_TONES, pair),
        className
      )}
      {...props}
    />
  )
}

// The pair's number in the card's corner: neutral until it's paired.
function ChoiceCardBadge({
  className,
  pair,
  ...props
}: React.ComponentProps<"span"> & { pair?: number | null }) {
  const isPaired = pair !== undefined && pair !== null
  return (
    <span
      data-slot="choice-card-badge"
      className={cn(
        "absolute top-1 left-1 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        isPaired ? cn("text-white", pairTone(PAIR_BADGE_TONES, pair)) : "bg-muted text-muted-foreground",
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
  ChoiceCard,
  ChoiceCardAnswerBox,
  ChoiceCardBadge,
  ChoiceCardColumns,
  ChoiceCardGrid,
  ChoiceCardImage,
  ChoiceCardMarker,
}
