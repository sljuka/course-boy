import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { AppSidebarItem } from "@/components/app-sidebar-item";
import { SidebarMenuBadge } from "@/components/ui/sidebar";
import { useBoardUnreadQuery } from "@/lib/board-queries";

// Teaching's Activity (SLJ-149), below My channel: what's new on your courses.
// For now their boards' unread messages, counted on the item.
export function AppSidebarActivity() {
  const { t } = useTranslation();
  const location = useLocation();
  const { data: unread } = useBoardUnreadQuery();
  const total = Object.values(unread ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <AppSidebarItem
      badge={total > 0 && <SidebarMenuBadge data-testid="sidebar-activity-count">{total > 99 ? "99+" : total}</SidebarMenuBadge>}
      href="/activity"
      isActive={location.pathname === "/activity"}
      testId="sidebar-activity"
    >
      <Activity aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{t("sidebar.activity")}</span>
    </AppSidebarItem>
  );
}
