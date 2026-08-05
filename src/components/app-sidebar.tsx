import { BookOpen, FileText, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
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

const sidebarItems = [
  { href: "/", icon: Home, id: "home" },
  { href: "/my-courses", icon: BookOpen, id: "myCourses" },
  { href: "/drafts", icon: FileText, id: "drafts" },
] as const;

function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { locale, setLocale } = useAppState();

  return (
    <Sidebar className="border-y border-l border-stone-200 bg-white text-stone-900 shadow-[0_20px_48px_-28px_rgba(41,37,36,0.18)]">
      <SidebarHeader className="space-y-4 border-b border-stone-200 px-4 py-5">
        <Link
          className="block text-base font-bold text-stone-950 transition-colors hover:text-stone-700"
          to="/"
        >
          Matkoslav
        </Link>
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
      </SidebarHeader>
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
      <SidebarFooter className="border-t border-stone-200 px-3 py-4">
        <AppMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
