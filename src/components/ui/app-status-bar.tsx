import * as React from "react";

import { cn } from "@/lib/utils";

// The strip along the bottom of the app frame, on the sidebar background.
// Global items go at the start; the current layout's items (e.g. the course
// editor's save status) at the end. Screen-only.
function AppStatusBar({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="app-status-bar"
      className={cn(
        "flex h-(--app-statusbar-height) shrink-0 items-center justify-between gap-3 px-3 text-xs text-sidebar-foreground/65 print:hidden",
        className,
      )}
      {...props}
    />
  );
}

function AppStatusBarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-status-bar-group"
      className={cn("flex min-w-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export { AppStatusBar, AppStatusBarGroup };
