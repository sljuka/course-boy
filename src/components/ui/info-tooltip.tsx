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
            "inline-flex h-6 w-6 items-center justify-center text-stone-400 transition-colors hover:text-stone-900",
            className,
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          type="button"
        >
          <CircleHelp aria-hidden="true" className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="block max-w-xs">{children}</TooltipContent>
    </Tooltip>
  );
}

export { InfoTooltip };
