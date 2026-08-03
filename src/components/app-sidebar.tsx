import { BookOpen, FileText, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const sidebarItems = [
  { href: "/", icon: Search, id: "searchCourses" },
  { href: "/my-courses", icon: BookOpen, id: "myCourses" },
  { href: "/drafts", icon: FileText, id: "drafts" },
] as const;

function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Sidebar className="border-y border-l border-stone-200 bg-stone-50 text-stone-900 shadow-[0_20px_48px_-28px_rgba(41,37,36,0.18)]">
      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="space-y-3">
          <SidebarGroupLabel className="px-2 text-stone-500">
            {t("sidebar.navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                      <span>{t(`sidebar.${item.id}`)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t-0 px-3 pb-4 pt-2">
        <Link
          to="/courses/new"
          className={cn(
            buttonVariants({ size: "md", variant: "primary" }),
            "gap-2",
          )}
        >
          <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{t("sidebar.createCourse")}</span>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
