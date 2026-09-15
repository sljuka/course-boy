import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageActionsProps = {
  children: ReactNode;
  className?: string;
};

export const PageActions = ({ children, className }: PageActionsProps) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {children}
    </div>
  );
};
