import * as React from "react"
import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// A star that marks something as a favorite: outlined and muted when off,
// filled amber when on. A toggle button (`aria-pressed`); `label` names what
// it does for screen readers and the tooltip.
function FavoriteToggle({
  className,
  label,
  onPressedChange,
  pressed,
  ...props
}: Omit<React.ComponentProps<"button">, "children" | "onClick"> & {
  label: string
  onPressedChange: (pressed: boolean) => void
  pressed: boolean
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:text-warning aria-pressed:hover:text-warning",
        className,
      )}
      data-slot="favorite-toggle"
      onClick={(event) => {
        // Inside a clickable row or card: toggling isn't opening it.
        event.preventDefault()
        event.stopPropagation()
        onPressedChange(!pressed)
      }}
      title={label}
      type="button"
      {...props}
    >
      <StarIcon aria-hidden="true" className={cn("size-4", pressed && "fill-current")} />
    </button>
  )
}

export { FavoriteToggle }
