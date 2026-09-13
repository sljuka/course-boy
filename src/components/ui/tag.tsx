import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn, getContrastTextColor } from "@/lib/utils";

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

type TagColor = NonNullable<VariantProps<typeof tagVariants>["color"]>;

// The fixed set tagVariants' cva config actually knows how to render. Kept
// as a plain literal (not derived from course-tags.ts, which itself derives
// TagColor from this file) to avoid a circular import between the two.
const KNOWN_TAG_COLORS: readonly string[] = [
  "amber",
  "emerald",
  "rose",
  "sky",
  "stone",
  "teal",
];

function isKnownTagColor(value: string): value is TagColor {
  return KNOWN_TAG_COLORS.includes(value);
}

const tagAccentBorderClassName: Record<TagColor, string> = {
  amber: "border-amber-300",
  emerald: "border-emerald-300",
  rose: "border-rose-300",
  sky: "border-sky-300",
  stone: "border-stone-300",
  teal: "border-teal-300",
};

/**
 * A subtle way to hint at a tag's color outside the pill itself (e.g. an
 * accent border under a title) — a Tailwind class for the fixed named
 * colors, or an inline style for an arbitrary one (a hex value can't be a
 * cva variant, same reasoning as `Tag` itself above).
 */
function getTagAccentStyle(
  color: string,
): { className: string; style?: undefined } | { className?: undefined; style: React.CSSProperties } {
  if (isKnownTagColor(color)) {
    return { className: tagAccentBorderClassName[color] };
  }

  return { style: { borderColor: color } };
}

function Tag({
  className,
  color,
  selected,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  color: string;
  selected?: boolean;
}) {
  if (isKnownTagColor(color)) {
    return (
      <Badge
        className={cn(tagVariants({ color, selected }), className)}
        style={style}
        {...props}
      />
    );
  }

  // An arbitrary color (e.g. a hex value from a custom color picker) can't
  // be a fixed cva variant, so it's applied as an inline style instead —
  // the pill shape/padding/font size still come from Badge's own ui-tier
  // classes, only the color itself is dynamic.
  return (
    <Badge
      className={cn("border", className)}
      style={{
        backgroundColor: color,
        borderColor: color,
        color: getContrastTextColor(color),
        ...style,
      }}
      {...props}
    />
  );
}

export { getTagAccentStyle, Tag };
export type { TagColor };
