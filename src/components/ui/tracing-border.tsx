import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A border drawn around its child for a result worth celebrating (the end of
// a test, SLJ-135): a line starts at the top centre, runs clockwise around
// the child's rounded edge and closes where it began. Gold also glows once
// drawn. With reduced motion it's simply there. The child keeps its own
// border; this one is drawn over it, following its size and corner radius.
const tracingBorderVariants = cva("[fill:none] [stroke-width:2]", {
  variants: {
    tone: {
      gold: "stroke-gold tracing-border-glow",
      green: "stroke-success",
      yellow: "stroke-streak",
      orange: "stroke-orange",
      red: "stroke-destructive",
      purple: "stroke-purple",
      blue: "stroke-info",
      grey: "stroke-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "gold",
  },
})

// From the top centre, clockwise, along a rounded rectangle inset by half the
// stroke so it isn't clipped.
function roundedOutline(width: number, height: number, radius: number, inset: number): string {
  const left = inset
  const top = inset
  const right = width - inset
  const bottom = height - inset
  const r = Math.max(0, Math.min(radius - inset, (right - left) / 2, (bottom - top) / 2))
  const middle = width / 2

  return [
    `M ${middle} ${top}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${left + r}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `V ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    "Z",
  ].join(" ")
}

function TracingBorder({
  children,
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof tracingBorderVariants>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [outline, setOutline] = React.useState<{ height: number; path: string; width: number } | null>(null)

  React.useLayoutEffect(() => {
    const container = containerRef.current
    const child = container?.firstElementChild as HTMLElement | null
    if (!container || !child) return

    function measure() {
      if (!container || !child) return
      const { height, width } = container.getBoundingClientRect()
      const radius = Number.parseFloat(getComputedStyle(child).borderTopLeftRadius) || 0
      setOutline({ height, path: roundedOutline(width, height, radius, 1), width })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={cn("relative", className)} data-slot="tracing-border" data-tone={tone} ref={containerRef} {...props}>
      {children}
      {outline && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible"
          height={outline.height}
          viewBox={`0 0 ${outline.width} ${outline.height}`}
          width={outline.width}
        >
          <path className={cn(tracingBorderVariants({ tone }), "tracing-border-draw")} d={outline.path} pathLength={1} />
        </svg>
      )}
    </div>
  )
}

export { TracingBorder }
