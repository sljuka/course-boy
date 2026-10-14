import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ZapIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// A lightning bolt with a count, for a run of right answers. `level` 0:
// muted, no count (no run yet); 1: yellow; 2–4: a yellow glow that grows, the
// bolt filling in. The bolt gives a short pulse each time the count goes up
// (none with reduced motion). Its meaning goes in `aria-label` (and a
// tooltip, if wanted): the count alone says little.
const streakCounterVariants = cva(
  "inline-flex shrink-0 items-center gap-1 text-sm/5 font-semibold tabular-nums transition-[color,filter] duration-500",
  {
    variants: {
      level: {
        0: "text-muted-foreground",
        1: "text-streak-foreground",
        // Each level adds a wider glow on top of the last (a single wider
        // shadow alone spreads thinner and looks weaker).
        2: "text-streak-foreground [filter:drop-shadow(0_0_2px_var(--streak))]",
        3: "text-streak-foreground [filter:drop-shadow(0_0_2px_var(--streak))_drop-shadow(0_0_6px_var(--streak))]",
        4: "text-streak-foreground [filter:drop-shadow(0_0_2px_var(--streak))_drop-shadow(0_0_6px_var(--streak))_drop-shadow(0_0_12px_var(--streak))]",
      },
    },
    defaultVariants: {
      level: 0,
    },
  }
)

// The bolt: outlined when there's no run, then yellow, filling in as it glows.
const boltLevels = {
  0: undefined,
  1: "text-streak fill-current/40",
  2: "text-streak fill-current/60",
  3: "text-streak fill-current/80",
  4: "text-streak fill-current",
} as const

function StreakCounter({
  className,
  count,
  level,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof streakCounterVariants> & {
    count: number
  }) {
  // Counts each rise, so the bolt (keyed by it) remounts and pulses once;
  // a drop (the run ending) is quiet.
  const [lastCount, setLastCount] = React.useState(count)
  const [rises, setRises] = React.useState(0)
  if (count !== lastCount) {
    setLastCount(count)
    if (count > lastCount) setRises(rises + 1)
  }

  return (
    <span
      className={cn(streakCounterVariants({ level }), className)}
      data-level={level}
      data-slot="streak-counter"
      role="img"
      {...props}
    >
      <ZapIcon
        aria-hidden="true"
        className={cn("size-5", boltLevels[level ?? 0], rises > 0 && "streak-counter-pulse")}
        key={rises}
      />
      {level !== 0 && <span aria-hidden="true">{count}</span>}
    </span>
  )
}

export { StreakCounter, streakCounterVariants }
