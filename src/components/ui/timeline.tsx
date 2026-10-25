import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A lesson's timeline (SLJ-35): a bar that stays at the top of the lesson
// while it scrolls. Rows of points (a dot, an icon, or a small round
// picture), each with its year under it and a thin stem down to its place on
// the track; the track filled up to "now", with the scale's ticks under it.
// A long bar is a strip wider than the window that slides sideways.
// Positions come from the caller in pixels along the strip (`x`) and down
// it (`y`).
//
//   <Timeline>
//     <TimelineStrip offset={…} width={…} height={…}>
//       <TimelineTrack y={…}><TimelineFill x={…} /><TimelineRange … /></TimelineTrack>
//       <TimelineStem x={…} y={…} height={…} />
//       <TimelinePoint x={…} y={…} state="active">…</TimelinePoint>
//       <TimelinePointYear x={…} y={…} state="active">1389</TimelinePointYear>
//       <TimelineTickMark x={…} y={…} labelled />
//       <TimelineTick x={…} y={…}>1400</TimelineTick>
//     </TimelineStrip>
//   </Timeline>
function Timeline({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline"
      className={cn(
        "sticky top-0 z-10 overflow-hidden border-b border-border/70 bg-background print:static print:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TimelineStrip({
  className,
  height,
  offset,
  style,
  width,
  ...props
}: React.ComponentProps<"div"> & { height: number; offset: number; width: number }) {
  return (
    <div
      data-slot="timeline-strip"
      className={cn("relative transition-transform duration-500 ease-out motion-reduce:transition-none", className)}
      style={{ ...style, height, transform: `translateX(${-offset}px)`, width }}
      {...props}
    />
  )
}

function TimelineTrack({
  className,
  style,
  y,
  ...props
}: React.ComponentProps<"div"> & { y: number }) {
  return (
    <div
      data-slot="timeline-track"
      className={cn("absolute inset-x-0 h-1 overflow-hidden rounded-full bg-muted", className)}
      style={{ ...style, top: y }}
      {...props}
    />
  )
}

// The part of the track already read, up to `x`.
function TimelineFill({ className, style, x, ...props }: React.ComponentProps<"div"> & { x: number }) {
  return (
    <div
      data-slot="timeline-fill"
      className={cn(
        "absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none",
        className
      )}
      style={{ ...style, width: x }}
      {...props}
    />
  )
}

// A span of years (a war, a reign) on the track.
function TimelineRange({
  className,
  end,
  start,
  style,
  ...props
}: React.ComponentProps<"div"> & { end: number; start: number }) {
  return (
    <div
      data-slot="timeline-range"
      className={cn("absolute inset-y-0 bg-primary/35", className)}
      style={{ ...style, left: start, width: end - start }}
      {...props}
    />
  )
}

// The thin line from a point down to its place on the track.
function TimelineStem({
  className,
  height,
  reached,
  style,
  x,
  y,
  ...props
}: React.ComponentProps<"span"> & { height: number; reached: boolean; x: number; y: number }) {
  return (
    <span
      data-slot="timeline-stem"
      className={cn("absolute w-px -translate-x-1/2", reached ? "bg-primary/50" : "bg-border", className)}
      style={{ ...style, height, left: x, top: y }}
      {...props}
    />
  )
}

const timelinePointVariants = cva(
  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 bg-background transition-all duration-300 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none print:transition-none",
  {
    variants: {
      state: {
        upcoming: "border-border",
        reached: "border-primary/60",
        active: "z-10 border-primary shadow-sm",
      },
      // A picture is a round thumbnail, an icon a circle the same size;
      // with neither, a dot.
      kind: {
        dot: "",
        icon: "text-foreground",
        picture: "",
      },
    },
    compoundVariants: [
      { kind: "dot", state: "upcoming", className: "size-3.5 bg-muted" },
      { kind: "dot", state: "reached", className: "size-3.5 bg-primary/60" },
      { kind: "dot", state: "active", className: "size-[18px] bg-primary" },
      { kind: "picture", state: "upcoming", className: "size-8 opacity-70 grayscale" },
      { kind: "picture", state: "reached", className: "size-8" },
      { kind: "picture", state: "active", className: "size-10" },
      { kind: "icon", state: "upcoming", className: "size-8 bg-muted opacity-70 [&>svg]:size-4" },
      { kind: "icon", state: "reached", className: "size-8 bg-muted [&>svg]:size-4" },
      { kind: "icon", state: "active", className: "size-10 bg-primary text-primary-foreground [&>svg]:size-5" },
    ],
    defaultVariants: { kind: "dot", state: "upcoming" },
  }
)

// A point, centred on (`x`, `y`).
function TimelinePoint({
  className,
  kind,
  state,
  style,
  x,
  y,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof timelinePointVariants> & { x: number; y: number }) {
  return (
    <button
      type="button"
      data-slot="timeline-point"
      data-state={state}
      className={cn(timelinePointVariants({ kind, state }), className)}
      style={{ ...style, left: x, top: y }}
      {...props}
    />
  )
}

function TimelinePointImage({ className, ...props }: React.ComponentProps<"img">) {
  return <img data-slot="timeline-point-image" className={cn("size-full object-cover", className)} {...props} />
}

const timelinePointYearVariants = cva(
  "absolute flex -translate-x-1/2 items-baseline gap-1.5 whitespace-nowrap tabular-nums text-foreground transition-all duration-300 motion-reduce:transition-none",
  {
    variants: {
      state: {
        upcoming: "text-xs/4 font-medium opacity-70",
        reached: "text-xs/4 font-medium",
        active: "z-10 rounded-sm bg-background/90 px-1 text-sm/4 font-bold",
      },
    },
    defaultVariants: { state: "upcoming" },
  }
)

// A point's year, under it; the current point's also carries its name
// (`TimelinePointName`).
function TimelinePointYear({
  className,
  state,
  style,
  x,
  y,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof timelinePointYearVariants> & { x: number; y: number }) {
  return (
    <span
      data-slot="timeline-point-year"
      className={cn(timelinePointYearVariants({ state }), className)}
      style={{ ...style, left: x, top: y }}
      {...props}
    />
  )
}

function TimelinePointName({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="timeline-point-name"
      className={cn("max-w-48 truncate font-semibold", className)}
      {...props}
    />
  )
}

const timelineTickMarkVariants = cva("absolute w-px -translate-x-1/2", {
  variants: {
    labelled: {
      false: "h-1 bg-muted-foreground/35",
      true: "h-2 bg-muted-foreground/70",
    },
  },
  defaultVariants: { labelled: false },
})

// A tick's short line under the track; a labelled one is longer.
function TimelineTickMark({
  className,
  labelled,
  style,
  x,
  y,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof timelineTickMarkVariants> & { x: number; y: number }) {
  return (
    <span
      data-slot="timeline-tick-mark"
      className={cn(timelineTickMarkVariants({ labelled }), className)}
      style={{ ...style, left: x, top: y }}
      {...props}
    />
  )
}

// A labelled tick's year.
function TimelineTick({
  className,
  style,
  x,
  y,
  ...props
}: React.ComponentProps<"span"> & { x: number; y: number }) {
  return (
    <span
      data-slot="timeline-tick"
      className={cn("absolute -translate-x-1/2 text-[10px]/4 whitespace-nowrap text-muted-foreground tabular-nums", className)}
      style={{ ...style, left: x, top: y }}
      {...props}
    />
  )
}

export {
  Timeline,
  TimelineFill,
  TimelinePoint,
  TimelinePointImage,
  TimelinePointName,
  TimelinePointYear,
  TimelineRange,
  TimelineStem,
  TimelineStrip,
  TimelineTick,
  TimelineTickMark,
  TimelineTrack,
}
