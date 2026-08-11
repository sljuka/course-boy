import { ChevronDown } from "lucide-react";
import * as React from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

function AccordionCardItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionItem>) {
  return (
    <AccordionItem
      className={cn(
        "rounded-3xl border border-stone-200 bg-white shadow-[0_16px_30px_-24px_rgba(28,25,23,0.18)]",
        className,
      )}
      {...props}
    />
  );
}

function AccordionCardHeader({
  actions,
  aside,
  bodyClassName,
  children,
  chevronClassName,
  className,
  contentClassName,
  triggerClassName,
  ...props
}: Omit<React.ComponentProps<typeof AccordionTrigger>, "className"> & {
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  bodyClassName?: string;
  chevronClassName?: string;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-4 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AccordionTrigger
          className={cn(
            "min-w-0 shrink justify-start py-0 hover:text-stone-700 focus-visible:ring-offset-white [&>svg]:hidden data-hidden:[&_svg.accordion-card-chevron]:-rotate-90 data-panel-open:[&_svg.accordion-card-chevron]:rotate-0",
            triggerClassName,
          )}
          {...props}
        >
          <div
            className={cn("flex min-w-0 items-start gap-3", contentClassName)}
          >
            <span className="inline-flex items-center text-stone-400">
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "accordion-card-chevron h-4 w-4 transition-transform",
                  chevronClassName,
                )}
              />
            </span>
            <div className={cn("min-w-0", bodyClassName)}>{children}</div>
          </div>
        </AccordionTrigger>
        {aside}
      </div>
      {actions}
    </div>
  );
}

function AccordionCardContent({
  className,
  ...props
}: React.ComponentProps<typeof AccordionContent>) {
  return (
    <AccordionContent className={cn("px-4 pb-4 pt-0", className)} {...props} />
  );
}

export { AccordionCardContent, AccordionCardHeader, AccordionCardItem };
