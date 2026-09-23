import type { ReactNode } from "react";

import { RoleGuard } from "@/components/role-guard";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type PageContentProps = {
  children: ReactNode;
  /** Rendered in the small-screen compact bar, right of the sidebar toggle. */
  actions?: ReactNode;
  /** Skip the max-width cap — for canvases like the block editor that want the full width. */
  fullBleed?: boolean;
  className?: string;
};

export const PageContent = ({
  actions,
  children,
  className,
  fullBleed,
}: PageContentProps) => {
  return (
    <div className="flex w-full flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2 lg:hidden print:hidden">
        <RoleGuard roles="teacher">
          <SidebarTrigger className="h-10! w-10!" shape="circle" size="icon" variant="outline" />
        </RoleGuard>
        {actions}
      </div>
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-4 p-4 sm:p-5 lg:p-6",
          !fullBleed && "lg:max-w-4xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};
