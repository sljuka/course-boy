import { BookOpen, FileText, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { CourseBoyLogo } from "@/components/course-boy-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAppState } from "@/lib/use-app-state";

const sidebarGroups = [
  {
    items: [{ href: "/", icon: Home, id: "home" }],
    label: null,
  },
  {
    items: [
      { href: "/my-courses", icon: BookOpen, id: "myCourses" },
      { href: "/drafts", icon: FileText, id: "drafts" },
    ],
    label: "myWork",
  },
] as const;

function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { locale, setLocale } = useAppState();

  return (
    <Sidebar className="border-y border-l border-stone-200 bg-white text-stone-900 shadow-[0_20px_48px_-28px_rgba(41,37,36,0.18)]">
      <SidebarHeader className="space-y-4 border-b border-stone-200 px-4 py-5">
        <Link
          className="flex items-center gap-2 text-base font-bold text-stone-950 transition-colors hover:text-stone-700"
          to="/"
        >
          <CourseBoyLogo className="h-7 w-7 shrink-0" />
          <span>{t("sidebar.appName")}</span>
        </Link>
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        {sidebarGroups.map((group) => (
          <SidebarGroup className="space-y-3" key={group.label ?? "root"}>
            {group.label && (
              <SidebarGroupLabel className="px-2 text-stone-500">
                {t(`sidebar.${group.label}`)}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.href}
                      render={<Link to={item.href} />}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                      <span>{t(`sidebar.${item.id}`)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-stone-200 px-3 py-4">
        <AppMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
