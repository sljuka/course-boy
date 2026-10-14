import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A graded test's score in its grade band's colour (SLJ-135,
// lib/grade-bands.ts): `GradeScore` large, on the results card;
// `GradeScoreBadge` small, under a test on the course page; `GradeToneDot`
// beside a colour's name where a teacher picks one. Gold glows. The text
// always says the score: the colour alone isn't the message.
const gradeToneText = {
  gold: "text-gold [filter:drop-shadow(0_0_6px_var(--gold))]",
  green: "text-success",
  yellow: "text-streak-foreground",
  orange: "text-orange",
  red: "text-destructive",
  purple: "text-purple",
  blue: "text-info",
  grey: "text-muted-foreground",
} as const

type GradeTone = keyof typeof gradeToneText

const gradeScoreVariants = cva("font-semibold tabular-nums", {
  variants: {
    tone: gradeToneText,
    size: {
      lg: "text-5xl/none tracking-tight",
      md: "text-2xl/8",
    },
  },
  defaultVariants: {
    size: "lg",
    tone: "grey",
  },
})

function GradeScore({
  className,
  size,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof gradeScoreVariants>) {
  return (
    <span
      className={cn(gradeScoreVariants({ size, tone }), className)}
      data-slot="grade-score"
      data-tone={tone}
      {...props}
    />
  )
}

const gradeScoreBadgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums [&>svg]:size-3!",
  {
    variants: {
      tone: {
        gold: "border-gold/40 bg-gold/10 text-gold shadow-[0_0_8px_var(--gold)]",
        green: "border-success/30 bg-success/10 text-success",
        yellow: "border-streak/50 bg-streak/15 text-streak-foreground",
        orange: "border-orange/30 bg-orange/10 text-orange",
        red: "border-destructive/30 bg-destructive/10 text-destructive",
        purple: "border-purple/30 bg-purple/10 text-purple",
        blue: "border-info/30 bg-info/10 text-info",
        grey: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "grey",
    },
  }
)

function GradeScoreBadge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof gradeScoreBadgeVariants>) {
  return (
    <span
      className={cn(gradeScoreBadgeVariants({ tone }), className)}
      data-slot="grade-score-badge"
      data-tone={tone}
      {...props}
    />
  )
}

const gradeToneDotVariants = cva("inline-block size-3 shrink-0 rounded-full", {
  variants: {
    tone: {
      gold: "bg-gold shadow-[0_0_6px_var(--gold)]",
      green: "bg-success",
      yellow: "bg-streak",
      orange: "bg-orange",
      red: "bg-destructive",
      purple: "bg-purple",
      blue: "bg-info",
      grey: "bg-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "grey",
  },
})

function GradeToneDot({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof gradeToneDotVariants>) {
  return (
    <span
      aria-hidden="true"
      className={cn(gradeToneDotVariants({ tone }), className)}
      data-slot="grade-tone-dot"
      {...props}
    />
  )
}

export { GradeScore, GradeScoreBadge, GradeToneDot, type GradeTone }
