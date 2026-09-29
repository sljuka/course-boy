import { BookOpen, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DEFAULT_PERSONA, PERSONAS, getPersonaIconUrl } from "@/lib/personas";
import type { UserRole } from "@/lib/preferences";
import { useAppState } from "@/lib/use-app-state";

// `roles` limits a group to those roles; groups without it show for everyone.
const sidebarGroups: readonly {
  items: readonly { href: string; icon: typeof Home; id: string }[];
  label: string;
  roles?: readonly UserRole[];
}[] = [
  {
    items: [{ href: "/", icon: Home, id: "home" }],
    label: "learning",
  },
  {
    items: [{ href: "/my-courses", icon: BookOpen, id: "myCourses" }],
    label: "teaching",
    roles: ["teacher"],
  },
];

// "My courses" stays highlighted while you're inside one of your courses
// (the editor) or creating one — they're part of that section.
function isSidebarItemActive(href: string, pathname: string): boolean {
  if (href === "/my-courses") {
    return pathname === href || pathname.startsWith("/drafts/") || pathname === "/courses/new";
  }

  return pathname === href;
}

function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { locale, persona, role, setLocale, setTheme, theme } = useAppState();
  const visibleGroups = sidebarGroups.filter(
    (group) => !group.roles || (role !== null && group.roles.includes(role)),
  );
  const personaLabelKey =
    PERSONAS.find((option) => option.id === persona)?.labelKey ??
    PERSONAS.find((option) => option.id === DEFAULT_PERSONA)!.labelKey;

  return (
    <Sidebar>
      <SidebarHeader className="space-y-4 px-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            className="flex items-center gap-2 text-base font-bold text-foreground transition-colors hover:text-foreground/80"
            to="/"
          >
            <img alt="" className="h-7 w-7 shrink-0 rounded-full" src={getPersonaIconUrl(persona)} />
            <span>{t(personaLabelKey)}</span>
          </Link>
          <ThemeToggle onThemeChange={setTheme} theme={theme} />
        </div>
        <div className="flex items-center gap-2">
          <AppMenu />
          <LanguageSwitcher
            className="min-w-0 flex-1"
            locale={locale}
            onLocaleChange={setLocale}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label ?? "root"}>
            {group.label && (
              <SidebarGroupLabel className="px-2 text-muted-foreground">
                {t(`sidebar.${group.label}`)}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isSidebarItemActive(item.href, location.pathname)}
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
    </Sidebar>
  );
}

export { AppSidebar };
