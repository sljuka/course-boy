import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Small state glyphs for list rows and group headers, like Linear's issue
// statuses: a filled circle for something out in the world (published), a
// dashed one for something that exists only here (local), and a half-filled
// amber one for work in progress that isn't saved as a version yet (changed —
// the same amber as the "Unpublished changes" badge). `downloading` is a ring
// that fills like a pie as `progress` (0–1) grows, and spins slowly while
// there's no progress to show yet (still looking for someone sharing it).
const statusIconVariants = cva("size-3.5 shrink-0", {
  variants: {
    status: {
      published: "text-primary",
      local: "text-muted-foreground",
      changed: "text-warning",
      downloading: "text-info",
    },
  },
  defaultVariants: { status: "local" },
})

type StatusIconProps = Omit<React.ComponentProps<"svg">, "children"> &
  VariantProps<typeof statusIconVariants> & {
    // `downloading` only: how far along, 0–1; null or unset while unknown.
    progress?: number | null
  }

// A pie slice drawn as a thick stroke on a small circle: its dash length is
// the filled share of the circumference.
const PIE_RADIUS = 1.75
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS

function StatusIcon({ className, progress, status, ...props }: StatusIconProps) {
  const isWaiting = status === "downloading" && (progress === null || progress === undefined)

  return (
    <svg
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(
        statusIconVariants({ status }),
        isWaiting && "animate-[spin_3s_linear_infinite]",
        className
      )}
      data-slot="status-icon"
      role={props["aria-label"] ? "img" : undefined}
      viewBox="0 0 14 14"
      {...props}
    >
      {status === "downloading" ? (
        isWaiting ? (
          <circle
            cx="7"
            cy="7"
            fill="none"
            r="6"
            stroke="currentColor"
            strokeDasharray="2.4 2"
            strokeWidth="1.5"
          />
        ) : (
          <>
            <circle cx="7" cy="7" fill="none" r="6" stroke="currentColor" strokeWidth="1.5" />
            <circle
              cx="7"
              cy="7"
              fill="none"
              r={PIE_RADIUS}
              stroke="currentColor"
              strokeDasharray={`${Math.min(1, Math.max(0, progress ?? 0)) * PIE_CIRCUMFERENCE} ${PIE_CIRCUMFERENCE}`}
              strokeWidth={PIE_RADIUS * 2}
              transform="rotate(-90 7 7)"
            />
          </>
        )
      ) : status === "changed" ? (
        <>
          <circle cx="7" cy="7" fill="none" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7Z" fill="currentColor" />
        </>
      ) : status === "published" ? (
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
