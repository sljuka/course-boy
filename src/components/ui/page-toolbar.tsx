import * as React from "react";

import { cn } from "@/lib/utils";

// The row across the top of the page card: navigation only — breadcrumbs, and
// right after the last crumb a small group of actions on the item itself
// (★, ⋯). Page-specific controls go in `PageActionBar` below it. Sits above
// `PageBody`, so it never scrolls away. Screen-only.
function PageToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-toolbar"
      className={cn(
        "flex h-11 shrink-0 items-center gap-3 border-b border-border/70 px-4 print:hidden",
        className,
      )}
      {...props}
    />
  );
}

function PageToolbarStart({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-toolbar-start"
      className={cn("flex min-w-0 flex-1 items-center gap-2", className)}
      {...props}
    />
  );
}

function PageToolbarCenter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-toolbar-center"
      className={cn("flex shrink-0 items-center justify-center", className)}
      {...props}
    />
  );
}

function PageToolbarEnd({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-toolbar-end"
      className={cn("flex min-w-0 flex-1 items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

// The page's second row, under the breadcrumbs: page-specific controls —
// panel toggles, view controls, page actions. Uses the same start / centre /
// end slots as `PageToolbar`. Lighter than the first row (no rule, shorter),
// since it belongs with the content below it. Screen-only.
function PageActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-action-bar"
      className={cn("flex h-10 shrink-0 items-center gap-3 px-3 print:hidden", className)}
      {...props}
    />
  );
}

export { PageActionBar, PageToolbar, PageToolbarCenter, PageToolbarEnd, PageToolbarStart };
