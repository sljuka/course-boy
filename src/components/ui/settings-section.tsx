import * as React from "react"
import { cva } from "class-variance-authority"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// A section of the Settings page: its title (and a line about it) above a
// card holding its settings, one block after another with a line between
// them. `danger` is the last section, for what can't be undone (removing the
// profile): its title and card take the destructive colour.
const settingsSectionTitleVariants = cva("font-heading text-base font-semibold", {
  variants: {
    variant: {
      default: "text-foreground",
      danger: "text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
})

const settingsSectionCardVariants = cva("", {
  variants: {
    variant: {
      default: "",
      danger: "ring-destructive/40",
    },
  },
  defaultVariants: { variant: "default" },
})

function SettingsSection({
  children,
  className,
  description,
  title,
  variant = "default",
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  description?: React.ReactNode
  title: React.ReactNode
  variant?: "default" | "danger"
}) {
  return (
    <section
      data-slot="settings-section"
      data-variant={variant}
      className={cn("flex w-full max-w-2xl flex-col gap-3", className)}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h2 className={settingsSectionTitleVariants({ variant })}>{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card className={settingsSectionCardVariants({ variant })}>
        <CardContent className="flex flex-col divide-y divide-border">
          {/* Each setting in its own row, so the spacing and the line around it
              never touch the setting's own styling (a bordered option, say). */}
          {React.Children.toArray(children).map((child, index) => (
            <div className="py-5 first:pt-0 last:pb-0" data-slot="settings-section-item" key={index}>
              {child}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

export { SettingsSection }
