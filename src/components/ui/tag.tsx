import * as React from "react";
import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import type { CourseTagColor } from "@/lib/course-tags";
import { cn } from "@/lib/utils";

const tagVariants = cva("", {
  variants: {
    color: {
      amber: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
      emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
      rose: "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100",
      sky: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
      stone: "border-stone-200 bg-stone-100 text-stone-900 hover:bg-stone-200",
      teal: "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100",
    },
    selected: {
      false: "",
      true: "",
    },
  },
  compoundVariants: [
    {
      className: "border-amber-500 bg-amber-500 text-white hover:bg-amber-600",
      color: "amber",
      selected: true,
    },
    {
      className:
        "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600",
      color: "emerald",
      selected: true,
    },
    {
      className: "border-rose-500 bg-rose-500 text-white hover:bg-rose-600",
      color: "rose",
      selected: true,
    },
    {
      className: "border-sky-500 bg-sky-500 text-white hover:bg-sky-600",
      color: "sky",
      selected: true,
    },
    {
      className: "border-stone-500 bg-stone-700 text-white hover:bg-stone-800",
      color: "stone",
      selected: true,
    },
    {
      className: "border-teal-500 bg-teal-500 text-white hover:bg-teal-600",
      color: "teal",
      selected: true,
    },
  ],
  defaultVariants: {
    color: "stone",
    selected: false,
  },
});

function Tag({
  className,
  color,
  selected,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  color: CourseTagColor;
  selected?: boolean;
}) {
  return (
    <Badge
      className={cn(tagVariants({ color, selected }), className)}
      {...props}
    />
  );
}

export { Tag };
