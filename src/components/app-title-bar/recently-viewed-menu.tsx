import { BookOpen, History, PencilLine, PlayCircle, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WindowTitleBarButton } from "@/components/ui/window-title-bar";
import { useCoursesQuery } from "@/lib/course-queries";
import type { RecentlyViewedKind } from "@/lib/recently-viewed";
import { useRecentlyViewedQuery } from "@/lib/recently-viewed-queries";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";
import { useAppState } from "@/lib/use-app-state";

const kindIcons: Record<RecentlyViewedKind, LucideIcon> = {
  course: BookOpen,
  draft: PencilLine,
  lesson: PlayCircle,
};

function RecentlyViewedMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale, role } = useAppState();
  const recentlyViewedQuery = useRecentlyViewedQuery();
  const coursesQuery = useCoursesQuery(locale);
  const coursesById = new Map((coursesQuery.data ?? []).map((course) => [course.id, course]));
  // A course deleted since it was viewed simply drops out of the list, drafts
  // (teacher-only pages, see RoleRoute) are hidden from students, and bundled
  // courses follow Settings' "Show Getting Started course".
  const [showBundledCourses] = useShowBundledCourses();
  const entries = (recentlyViewedQuery.data ?? []).filter(
    (entry) =>
      coursesById.has(entry.courseId) &&
      (entry.kind !== "draft" || role === "teacher") &&
      (showBundledCourses || coursesById.get(entry.courseId)?.distribution !== "bundled"),
  );
  const label = t("titleBar.recentlyViewed");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <WindowTitleBarButton
            aria-label={label}
            disabled={entries.length === 0}
            title={entries.length === 0 ? t("titleBar.recentlyViewedEmpty") : label}
          />
        }
      >
        <History aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {entries.map((entry) => {
            const KindIcon = kindIcons[entry.kind];
            const kindLabel = t(`titleBar.recentKind.${entry.kind}`);

            return (
              <DropdownMenuItem
                key={`${entry.kind}:${entry.courseId}`}
                onClick={() => navigate(entry.path)}
              >
                <KindIcon aria-label={kindLabel} role="img" />
                <span className="min-w-0 flex-1 truncate">
                  {coursesById.get(entry.courseId)?.title}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { RecentlyViewedMenu };
