import * as React from "react";

import { cn } from "@/lib/utils";

function Alert({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative w-full rounded-xl border border-sky-200 bg-sky-50/90 px-3 py-3 text-sky-950 shadow-[0_12px_28px_-24px_rgba(2,132,199,0.35)]",
        className,
      )}
      role="alert"
      {...props}
    />
  );
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("text-sm font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm leading-5 text-sky-900/90", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
