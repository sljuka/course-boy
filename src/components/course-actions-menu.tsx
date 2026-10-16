import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { type CourseAction, type CourseActionsCourse, useCourseActions } from "@/components/use-course-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// A course's own menu (⋯), at the end of the page's action bar: after Publish
// in the editor's course page (which adds Commit new version through
// `items`, and Discard changes through `destructiveItems`), after Share on the
// course details page. Its actions are `useCourseActions`'.
export function CourseActionsMenu({
  afterRemovePath,
  course,
  destructiveItems,
  items,
}: {
  afterRemovePath: string;
  course: CourseActionsCourse;
  // The page's own items, first (e.g. the editor's Commit new version).
  items?: ReactNode;
  // The page's own destructive items, in red right above Remove course (e.g.
  // the editor's Discard changes).
  destructiveItems?: ReactNode;
}) {
  const { t } = useTranslation();
  const { actions, dialogs, finalAction } = useCourseActions(course, afterRemovePath);
  const item = (action: CourseAction) => (
    <DropdownMenuItem
      data-testid={action.testId}
      disabled={action.disabled}
      key={action.id}
      onClick={action.onSelect}
      variant={action.destructive ? "destructive" : undefined}
    >
      <action.icon aria-hidden="true" />
      {action.label}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("courseSearch.courseMenuLabel", { title: course.title })}
              data-testid="course-actions-menu"
              shape="circle"
              size="icon-sm"
              title={t("courseSearch.courseMenuLabel", { title: course.title })}
              variant="subtle"
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {items && (
            <>
              {items}
              <DropdownMenuSeparator />
            </>
          )}
          {actions.map(item)}
          {finalAction.destructive && destructiveItems}
          {item(finalAction)}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}
