import { BookOpen, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { DEFAULT_PERSONA, PERSONAS, getPersonaIconUrl } from "@/lib/personas";
import { useAppState } from "@/lib/use-app-state";

const sidebarGroups = [
  {
    items: [{ href: "/", icon: Home, id: "home" }],
    label: "learning",
  },
  {
    items: [{ href: "/my-courses", icon: BookOpen, id: "myCourses" }],
    label: "teaching",
  },
] as const;

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
  const { locale, persona, setLocale, setTheme, theme } = useAppState();
  const personaLabelKey =
    PERSONAS.find((option) => option.id === persona)?.labelKey ??
    PERSONAS.find((option) => option.id === DEFAULT_PERSONA)!.labelKey;

  return (
    <Sidebar>
      <SidebarHeader className="space-y-4 border-b px-4 py-5">
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
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        {sidebarGroups.map((group) => (
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
      <SidebarFooter className="border-t px-3 py-4">
        <AppMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

export { AppSidebar };
