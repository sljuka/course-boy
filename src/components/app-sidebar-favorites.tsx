import { BookOpen, Library, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { useCoursesQuery } from "@/lib/course-queries";
import { useProgramsQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";

// A starred course or program (SLJ-32) in the sidebar.
type FavoriteItem = {
  favoritedAt: string;
  href: string;
  icon: typeof BookOpen;
  id: string;
  title: string;
};

// The sidebar's Favorites (SLJ-50): everything the student starred, in the
// order they starred it (newest last), each opening its page. Not shown at
// all until something is starred.
export function AppSidebarFavorites() {
  const { t } = useTranslation();
  const location = useLocation();
  const { locale } = useAppState();
  const { data: progress } = useCourseProgressQuery();
  const { data: courses = [] } = useCoursesQuery(locale);
  const { data: programs = [] } = useProgramsQuery(locale);

  const items: FavoriteItem[] = [
    ...courses
      .filter((course) => progress?.courses[course.id]?.favorite === true)
      .map((course) => ({
        favoritedAt: progress?.courses[course.id]?.favoritedAt ?? "",
        href: `/courses/${course.id}`,
        icon: BookOpen,
        id: course.id,
        title: course.title,
      })),
    ...programs
      .filter((program) => progress?.programs?.[program.id]?.favorite === true)
      .map((program) => ({
        favoritedAt: progress?.programs?.[program.id]?.favoritedAt ?? "",
        href: `/${program.kind === "channel" ? "channels" : "programs"}/${program.id}`,
        icon: program.kind === "channel" ? Radio : Library,
        id: program.id,
        title: program.title || t("programs.untitled"),
      })),
  ].sort((left, right) => left.favoritedAt.localeCompare(right.favoritedAt));

  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup data-testid="sidebar-favorites">
      <SidebarGroupLabel className="px-2 text-muted-foreground">{t("sidebar.favorites")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                // Highlighted on its page and while playing it.
                isActive={location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)}
                render={<Link to={item.href} />}
                title={item.title}
              >
                <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
