import { Contact } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { AppSidebarItem } from "@/components/app-sidebar-item";
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from "@/components/ui/sidebar";

// Publishers (SLJ-108) as its own section, below Favorites: for teachers
// (inviting maintainers) and students alike (who published what they took).
export function AppSidebarPublishers() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <SidebarGroup data-testid="sidebar-publishers">
      <SidebarGroupContent>
        <SidebarMenu>
          <AppSidebarItem href="/publishers" isActive={location.pathname === "/publishers"}>
            <Contact aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{t("sidebar.publishers")}</span>
          </AppSidebarItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
