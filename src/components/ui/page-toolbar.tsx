import * as React from "react";

import { cn } from "@/lib/utils";

// The row across the top of the page card: breadcrumbs at the start, an
// optional centred control (e.g. the test stepper) and page actions at the
// end. Sits above `PageBody`, so it never scrolls away. Screen-only.
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

export { PageToolbar, PageToolbarCenter, PageToolbarEnd, PageToolbarStart };
