import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white",
  {
    variants: {
      variant: {
        default: "border-stone-200 bg-white text-stone-700",
        draft: "border-amber-200 bg-amber-50 text-amber-800",
        secondary: "border-stone-200 bg-white text-stone-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        variable: "border-sky-200 bg-sky-50 text-sky-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
