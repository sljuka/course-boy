import * as React from "react";

import { cn } from "@/lib/utils";

// The window's frame: title bar row, main row, status bar row — all on the
// sidebar background, so the title bar, sidebar, gutters and status bar read
// as one continuous surface around the page card (`PagePanel`). Exactly one
// window tall and never scrolls itself; only a page's own `PageBody` does.
// Printing drops the fixed height, overflow and background so content flows
// across paper pages. See docs/contracts.md §9.
function AppShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell"
      className={cn(
        "flex h-svh flex-col overflow-hidden bg-sidebar text-foreground print:block print:h-auto print:overflow-visible print:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

// The row between title bar and status bar that route layouts render into.
function AppShellMain({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell-main"
      className={cn("relative flex min-h-0 flex-1 print:block", className)}
      {...props}
    />
  );
}

export { AppShell, AppShellMain };
