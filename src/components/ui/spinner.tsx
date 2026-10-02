import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

// shadcn's Spinner (base-nova, lucide icon), with one change: no built-in
// English `aria-label="Loading"`. Copy goes through i18next, so callers pass a
// translated `aria-label`, or `aria-hidden` when visible text already says it.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
