import * as React from "react";

import { cn } from "@/lib/utils";

// The page card inside the app frame: rounded on all corners, page background,
// lifted off the frame by a hairline border. It doesn't scroll itself — its
// `PageBody` does — so the toolbar at its top stays put and the scrollbar sits
// inside the rounded card. Printing strips the card entirely (no margin,
// radius, border, background or clipping), so paper shows only the content.
function PagePanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-panel"
      className={cn(
        "relative mx-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-xs print:m-0 print:block print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

// The page's scroll container — the only thing in the window that scrolls.
function PageBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto print:overflow-visible",
        className,
      )}
      {...props}
    />
  );
}

export { PageBody, PagePanel };
