import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

// A dense, one-line list row (Linear's issue rows). The whole row is
// clickable through `ListRowLink`, whose hit area stretches over the row;
// anything in `ListRowActions` sits above it so its own buttons still work.
function ListRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row"
      className={cn(
        "relative flex h-10 min-w-0 items-center gap-3 rounded-md px-2 text-sm transition-colors has-[[data-slot=list-row-link]:focus-visible]:bg-muted hover:bg-muted/60",
        className
      )}
      {...props}
    />
  )
}

// The row's title, rendered as a link (pass `render={<Link to=… />}`).
function ListRowLink({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        className: cn(
          "min-w-0 flex-1 truncate font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-md",
          className
        ),
      },
      props
    ),
    state: { slot: "list-row-link" },
  })
}

// Secondary information: small, muted, never wraps.
function ListRowMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="list-row-meta"
      className={cn("shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums", className)}
      {...props}
    />
  )
}

function ListRowActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row-actions"
      className={cn("relative z-10 flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  )
}

export { ListRow, ListRowActions, ListRowLink, ListRowMeta }
