import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A channel-style header: a wide banner (an image, or a soft gradient in
// `--cover-color`, falling back to the primary color) and a round logo
// overlapping its lower edge, like a video channel's page. Used by a
// program's page and its editor's preview.
function CoverBanner({
  className,
  src,
  ...props
}: React.ComponentProps<"div"> & { src?: string | null }) {
  return (
    <div
      data-slot="cover-banner"
      className={cn(
        "relative aspect-[6/1] min-h-24 w-full overflow-hidden rounded-xl border border-border bg-[linear-gradient(120deg,color-mix(in_oklab,var(--cover-color,var(--primary))_55%,transparent),color-mix(in_oklab,var(--cover-color,var(--primary))_15%,transparent))]",
        className,
      )}
      {...props}
    >
      {src && <img alt="" className="size-full object-cover" src={src} />}
    </div>
  )
}

// `relative z-10`: drawn over the banner's edge it overlaps (the banner is
// positioned, so it would otherwise paint on top).
const coverLogoVariants = cva(
  "relative z-10 flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted text-muted-foreground shadow-sm *:size-full *:object-cover",
  {
    variants: {
      size: {
        default: "size-24",
        small: "size-10 border-2 shadow-none",
      },
    },
    defaultVariants: { size: "default" },
  },
)

function CoverLogo({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof coverLogoVariants>) {
  return <div data-slot="cover-logo" className={cn(coverLogoVariants({ size }), className)} {...props} />
}

// A step's number in a sequence (a program's course order), in the cover's
// accent (`--cover-accent`), or the muted secondary color without one.
function CoverStepNumber({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="cover-step-number"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--cover-accent,var(--secondary))_25%,transparent)] text-sm font-semibold text-[var(--cover-accent,var(--secondary-foreground))] tabular-nums",
        className,
      )}
      {...props}
    />
  )
}

export { CoverBanner, CoverLogo, CoverStepNumber }
