import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A rounded frame around one image or video (the `img`/`video` is its child).
// `default`: media that's part of the content, filling the column up to 36rem
// (a small image is scaled up, so every exercise's picture reads alike),
// height capped; `small`: decorative media, at its own size up to a small
// height; `large`: an enlarged view, as wide as its container allows. The media keeps its aspect ratio and
// never overflows the frame.
const mediaFrameVariants = cva(
  "inline-flex max-w-full overflow-hidden rounded-lg border border-border bg-muted *:block *:h-auto *:max-w-full *:object-contain print:break-inside-avoid",
  {
    variants: {
      size: {
        default: "w-full max-w-xl justify-center *:max-h-96 *:w-full",
        small: "*:max-h-28",
        large: "w-full justify-center *:max-h-[85vh] *:w-full",
      },
    },
    defaultVariants: { size: "default" },
  },
)

function MediaFrame({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof mediaFrameVariants>) {
  return <div data-slot="media-frame" className={cn(mediaFrameVariants({ size }), className)} {...props} />
}

export { MediaFrame }
