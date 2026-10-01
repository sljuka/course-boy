import * as React from "react"

import { cn } from "@/lib/utils"

// A strip that stays at the top of the page's scroll area (`PageBody`) while
// the content scrolls under it, e.g. the test editor's language tabs. The
// page background hides what passes beneath; the negative margin cancels the
// padding, so in place it takes the same room as its content.
function StickyBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sticky-bar"
      className={cn("sticky top-0 z-10 -my-2 bg-background py-2", className)}
      {...props}
    />
  )
}

export { StickyBar }
