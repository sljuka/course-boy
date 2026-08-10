import * as React from "react";

import { cn } from "@/lib/utils";

function Eyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.18em] text-stone-500",
        className,
      )}
      {...props}
    />
  );
}

export { Eyebrow };
