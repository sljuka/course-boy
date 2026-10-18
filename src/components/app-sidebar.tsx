import { BookOpen, Home, Library, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { AppSidebarApprovals } from "@/components/app-sidebar-approvals";
import { AppSidebarFavorites } from "@/components/app-sidebar-favorites";
import { AppSidebarItem } from "@/components/app-sidebar-item";
import { AppSidebarPublishers } from "@/components/app-sidebar-publishers";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { getPersonaIconUrl } from "@/lib/personas";
import type { UserRole } from "@/lib/preferences";
import { useProfilesStateQuery } from "@/lib/profiles-queries";
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
    items: [
      { href: "/my-courses", icon: BookOpen, id: "myCourses" },
      { href: "/my-programs", icon: Library, id: "myPrograms" },
      { href: "/my-channel", icon: Radio, id: "myChannel" },
    ],
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

  if (href === "/my-programs") {
    return pathname === href || pathname.startsWith("/my-programs/");
  }

  return pathname === href;
}

function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  // As a drawer (narrow windows), close after navigating somewhere.
  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);
  const { locale, persona, role, setLocale } = useAppState();
  const { data: profiles } = useProfilesStateQuery();
  const visibleGroups = sidebarGroups.filter(
    (group) => !group.roles || (role !== null && group.roles.includes(role)),
  );

  return (
    <Sidebar closeLabel={t("drawer.close")}>
      <SidebarHeader className="space-y-4 px-4 py-5">
        {/* Whose profile this is (SLJ-57), its name as typed; the theme is in
            Settings. */}
        <Link
          className="flex min-w-0 items-center gap-2 text-sm text-foreground transition-colors hover:text-foreground/80"
          data-testid="sidebar-profile-name"
          title={profiles?.active?.name}
          to="/"
        >
          <img alt="" className="size-5 shrink-0 rounded-full" src={getPersonaIconUrl(persona)} />
          <span className="truncate">{profiles?.active?.name}</span>
        </Link>
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
                  <AppSidebarItem
                    href={item.href}
                    isActive={isSidebarItemActive(item.href, location.pathname)}
                    key={item.href}
                  >
                    <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{t(`sidebar.${item.id}`)}</span>
                  </AppSidebarItem>
                ))}
                {/* Under Teaching: versions waiting for your approval (SLJ-11). */}
                {group.label === "teaching" && <AppSidebarApprovals />}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {/* After the role's groups (below Teaching for a teacher). */}
        <AppSidebarFavorites />
        {/* Its own section, below Favorites (SLJ-108). */}
        <AppSidebarPublishers />
      </SidebarContent>
    </Sidebar>
  );
}

export { AppSidebar };
