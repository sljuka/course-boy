import type { ReactNode } from "react";

import { RoleGuard } from "@/components/role-guard";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppHeaderProps = {
  children?: ReactNode;
};

export const AppHeader = ({ children }: AppHeaderProps) => {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white px-4 py-2 lg:hidden">
      <RoleGuard roles="teacher">
        <SidebarTrigger className="h-10 w-10 rounded-full border-stone-200 bg-white shadow-[0_12px_30px_-20px_rgba(41,37,36,0.35)]" />
      </RoleGuard>
      {children}
    </div>
  );
};
