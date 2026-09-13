import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function InfoTooltip({
  "aria-label": ariaLabel = "More information",
  children,
  className,
}: {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <button
          aria-label={ariaLabel}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900",
            className,
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          type="button"
        >
          <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="block max-w-xs">{children}</TooltipContent>
    </Tooltip>
  );
}

export { InfoTooltip };
