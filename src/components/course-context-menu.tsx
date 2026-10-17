import { Link2, SquarePlus, Star, StarOff } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { type CourseAction, type CourseActionsCourse, useCourseActions } from "@/components/use-course-actions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { courseAppLink } from "@/lib/app-links";
import { useCourseProgressQuery, useSetFavoriteMutation } from "@/lib/course-progress-queries";
import { useOptionalAppTabs } from "@/lib/use-app-tabs";

// A course in a list (Home, My courses, a program's page) on right-click
// (SLJ-12): Open in new tab, Copy link (SLJ-60), its star (where the list
// shows one), then the same actions as its ⋯ menu. `children` is the card or row; a removed
// course leaves nowhere, so the list stays where it is.
export function CourseContextMenu({
  children,
  course,
  favorite = false,
  href,
}: {
  children: ReactNode;
  course: CourseActionsCourse;
  // Add to / Remove from favorites (a course you take; not your own drafts).
  favorite?: boolean;
  href: string;
}) {
  const { t } = useTranslation();
  const tabs = useOptionalAppTabs();
  const { actions, dialogs, finalAction } = useCourseActions(course, "");
  const { data: progress } = useCourseProgressQuery();
  const { mutate: setFavorite } = useSetFavoriteMutation();
  const isFavorite = progress?.courses[course.id]?.favorite === true;
  const item = (action: CourseAction) => (
    <ContextMenuItem
      disabled={action.disabled}
      key={action.id}
      onClick={action.onSelect}
      variant={action.destructive ? "destructive" : undefined}
    >
      <action.icon aria-hidden="true" />
      {action.label}
    </ContextMenuItem>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="contents" data-testid="course-context-trigger">
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => tabs?.open(href)}>
            <SquarePlus aria-hidden="true" />
            {t("titleBar.openInNewTab")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void navigator.clipboard.writeText(courseAppLink(course.id))}>
            <Link2 aria-hidden="true" />
            {t("appLinks.copyLink")}
          </ContextMenuItem>
          {favorite && (
            <ContextMenuItem onClick={() => setFavorite({ courseId: course.id, favorite: !isFavorite })}>
              {isFavorite ? <StarOff aria-hidden="true" /> : <Star aria-hidden="true" />}
              {isFavorite ? t("courseProgress.unfavorite") : t("courseProgress.favorite")}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          {actions.map(item)}
          {item(finalAction)}
        </ContextMenuContent>
      </ContextMenu>
      {dialogs}
    </>
  );
}
