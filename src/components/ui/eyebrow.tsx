import * as React from "react";

import { cn } from "@/lib/utils";

type EyebrowProps = React.HTMLAttributes<HTMLParagraphElement> & {
  size?: "default" | "small";
};

function Eyebrow({
  className,
  size = "default",
  ...props
}: EyebrowProps) {
  return (
    <p
      className={cn(
        "font-semibold uppercase tracking-[0.18em] text-stone-600",
        size === "small" ? "text-xs" : "text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Eyebrow };
