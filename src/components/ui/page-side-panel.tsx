import * as React from "react";

import { cn } from "@/lib/utils";

// A panel inside the page card, beside the page's scrolling body (e.g. the
// course editor's explorer). Scrolls on its own. No separator line: the panel
// and the body sit on the same card surface. Screen-only.
function PageSidePanel({
  className,
  side = "left",
  ...props
}: React.ComponentProps<"aside"> & { side?: "left" | "right" }) {
  return (
    <aside
      data-side={side}
      data-slot="page-side-panel"
      className={cn("flex min-h-0 w-64 shrink-0 flex-col overflow-y-auto print:hidden", className)}
      {...props}
    />
  );
}

export { PageSidePanel };
