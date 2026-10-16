import { CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { AppSidebarItem } from "@/components/app-sidebar-item";
import { SidebarMenuBadge } from "@/components/ui/sidebar";
import { useApprovalsQuery } from "@/lib/maintainers-queries";

// Teaching's Approvals (SLJ-11, SLJ-109): shown once you maintain a course
// together with others, badged with how many versions wait for you.
export function AppSidebarApprovals() {
  const { t } = useTranslation();
  const location = useLocation();
  const { data } = useApprovalsQuery();

  if (!data || data.maintained === 0) return null;
  const waiting = data.items.filter((item) => item.group === "waiting-for-you").length;

  return (
    <AppSidebarItem
      badge={waiting > 0 && <SidebarMenuBadge data-testid="sidebar-approvals-count">{waiting}</SidebarMenuBadge>}
      href="/approvals"
      isActive={location.pathname.startsWith("/approvals")}
      testId="sidebar-approvals"
    >
      <CheckCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{t("sidebar.approvals")}</span>
    </AppSidebarItem>
  );
}
