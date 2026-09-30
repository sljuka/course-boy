import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Small state glyphs for list rows and group headers, like Linear's issue
// statuses: a filled circle for something out in the world (published), a
// dashed one for something that exists only here (local).
const statusIconVariants = cva("size-3.5 shrink-0", {
  variants: {
    status: {
      published: "text-primary",
      local: "text-muted-foreground",
    },
  },
  defaultVariants: { status: "local" },
})

type StatusIconProps = Omit<React.ComponentProps<"svg">, "children"> &
  VariantProps<typeof statusIconVariants>

function StatusIcon({ className, status, ...props }: StatusIconProps) {
  return (
    <svg
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(statusIconVariants({ status }), className)}
      data-slot="status-icon"
      role={props["aria-label"] ? "img" : undefined}
      viewBox="0 0 14 14"
      {...props}
    >
      {status === "published" ? (
        <>
          <circle cx="7" cy="7" fill="none" r="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" fill="currentColor" r="3.5" />
        </>
      ) : (
        <circle
          cx="7"
          cy="7"
          fill="none"
          r="6"
          stroke="currentColor"
          strokeDasharray="2.4 2"
          strokeWidth="1.5"
        />
      )}
    </svg>
  )
}

export { StatusIcon }
