import { Contact } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Publishers (SLJ-108) as its own section, below Favorites: for teachers
// (inviting maintainers) and students alike (who published what they took).
export function AppSidebarPublishers() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <SidebarGroup data-testid="sidebar-publishers">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={location.pathname === "/publishers"} render={<Link to="/publishers" />}>
              <Contact aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{t("sidebar.publishers")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
