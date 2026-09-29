import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A panel inside the page card, beside the page's scrolling body (e.g. the
// course editor's explorer). Scrolls on its own; separated from the body by a
// hairline on the side facing it. Screen-only.
const pageSidePanelVariants = cva(
  "flex min-h-0 w-64 shrink-0 flex-col overflow-y-auto border-border/70 print:hidden",
  {
    variants: {
      side: {
        left: "border-r",
        right: "border-l",
      },
    },
    defaultVariants: { side: "left" },
  },
);

function PageSidePanel({
  className,
  side,
  ...props
}: React.ComponentProps<"aside"> & VariantProps<typeof pageSidePanelVariants>) {
  return (
    <aside
      data-side={side}
      data-slot="page-side-panel"
      className={cn(pageSidePanelVariants({ side }), className)}
      {...props}
    />
  );
}

export { PageSidePanel };
