import * as React from "react"

import { cn } from "@/lib/utils"

// A number with its label, like Linear's insight tiles: the label above, the
// number large below, and an optional muted line under it. StatGroup lays
// several side by side in one bordered row, divided by lines (one per line
// on a narrow window).
function StatGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-group"
      className={cn(
        "grid grid-cols-1 divide-y divide-border/70 rounded-lg border border-border/70 bg-card sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none sm:divide-x sm:divide-y-0",
        className
      )}
      {...props}
    />
  )
}

function Stat({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat" className={cn("flex min-w-0 flex-col gap-1 px-4 py-3", className)} {...props} />
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat-label" className={cn("truncate text-xs text-muted-foreground", className)} {...props} />
}

function StatValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-value"
      className={cn("text-2xl/8 font-semibold text-foreground tabular-nums", className)}
      {...props}
    />
  )
}

function StatHint({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat-hint" className={cn("truncate text-xs text-muted-foreground", className)} {...props} />
}

export { Stat, StatGroup, StatHint, StatLabel, StatValue }
