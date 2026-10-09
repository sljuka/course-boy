import { CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useApprovalsQuery } from "@/lib/maintainers-queries";

// Teaching's Approvals (SLJ-11): versions other maintainers proposed, waiting
// for you, with how many. Not shown while nothing is waiting.
export function AppSidebarApprovals() {
  const { t } = useTranslation();
  const location = useLocation();
  const { data: approvals = [] } = useApprovalsQuery();

  if (approvals.length === 0) return null;

  return (
    <SidebarMenuItem data-testid="sidebar-approvals">
      <SidebarMenuButton isActive={location.pathname.startsWith("/approvals")} render={<Link to="/approvals" />}>
        <CheckCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{t("sidebar.approvals")}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge>{approvals.length}</SidebarMenuBadge>
    </SidebarMenuItem>
  );
}
