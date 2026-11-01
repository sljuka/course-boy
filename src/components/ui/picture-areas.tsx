import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A picture with areas marked on it (SLJ-179, Find in the picture). Areas and
// marks are placed by fractions of the picture (0–1), so they stay put at any
// size; the caller passes them as percentages in `style`.
function PictureStage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="picture-stage"
      className={cn("relative w-full touch-manipulation overflow-hidden rounded-xl border bg-muted/20 select-none", className)}
      {...props}
    />
  )
}

function PictureStageImage({ className, ...props }: React.ComponentProps<"img">) {
  return (
    <img
      data-slot="picture-stage-image"
      className={cn("block h-auto w-full", className)}
      draggable={false}
      {...props}
    />
  )
}

// An area's outline: what the student tapped, what was right or wrong after
// a check, or (in the editor) every area, right ones solid.
const pictureAreaVariants = cva("pointer-events-none absolute border-[3px] transition-colors motion-reduce:transition-none", {
  variants: {
    shape: {
      rect: "rounded-md",
      ellipse: "rounded-[50%]",
    },
    tone: {
      picked: "border-primary bg-primary/15 shadow-[0_0_0_2px_white]",
      right: "border-success bg-success/15 shadow-[0_0_0_2px_white]",
      wrong: "border-destructive bg-destructive/15 shadow-[0_0_0_2px_white]",
      answer: "border-success border-dashed shadow-[0_0_0_2px_white]",
      editor: "border-white border-dashed bg-black/10 shadow-[0_0_0_2px_black]",
      editorRight: "border-success bg-success/20 shadow-[0_0_0_2px_white]",
    },
  },
  defaultVariants: { shape: "rect", tone: "picked" },
})

function PictureArea({ className, shape, tone, ...props }: React.ComponentProps<"div"> & VariantProps<typeof pictureAreaVariants>) {
  return <div data-slot="picture-area" className={cn(pictureAreaVariants({ shape, tone }), className)} {...props} />
}

// A tap that hit no area: a small ring where it landed. While answering it
// looks like any tap (`picked`), so it doesn't give away that nothing's there.
const pictureMissVariants = cva(
  "pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-[0_0_0_2px_white]",
  {
    variants: {
      tone: {
        picked: "border-primary bg-primary/20",
        wrong: "border-destructive bg-destructive/20",
      },
    },
    defaultVariants: { tone: "picked" },
  }
)

function PictureMiss({ className, tone, ...props }: React.ComponentProps<"div"> & VariantProps<typeof pictureMissVariants>) {
  return <div data-slot="picture-miss" className={cn(pictureMissVariants({ tone }), className)} {...props} />
}

// An area's number in the editor's list and on the picture.
function PictureAreaNumber({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="picture-area-number"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { PictureArea, PictureAreaNumber, PictureMiss, PictureStage, PictureStageImage }
