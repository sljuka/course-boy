import { EyeOff, FolderOpen, MoreHorizontal, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { RemoveCourseDialog } from "@/components/course-search/remove-course-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseDistribution } from "@/lib/course-package";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";

// A course's own menu (⋯), at the end of the page's action bar: after Publish
// in the editor's course page (which adds Commit new version through
// `items`, and Discard changes through `destructiveItems`), after Share on the
// course details page. Remove course asks first, then leaves for `afterRemovePath` (the
// course is gone). The bundled course offers Hide instead. An imported course
// also offers Open in file system.
export function CourseActionsMenu({
  afterRemovePath,
  course,
  destructiveItems,
  items,
}: {
  afterRemovePath: string;
  course: { distribution?: CourseDistribution; id: string; title: string };
  // The page's own items, first (e.g. the editor's Commit new version).
  items?: ReactNode;
  // The page's own destructive items, in red right above Remove course (e.g.
  // the editor's Discard changes).
  destructiveItems?: ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [, setShowBundledCourses] = useShowBundledCourses();
  // The bundled course (Getting Started) is hidden, not deleted: the same
  // switch as Settings' "Show Getting Started course", so it can come back.
  const isBundled = course.distribution === "bundled";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("courseSearch.courseMenuLabel", { title: course.title })}
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
          {/* A course you imported: its files, like the explorer's "Open in file
              system" on your own courses (same icon). */}
          {course.distribution === "imported" && (
            <DropdownMenuItem onClick={() => void window.courses.openInFileSystem(course.id)}>
              <FolderOpen aria-hidden="true" />
              {t("courseSearch.openInFileSystem")}
            </DropdownMenuItem>
          )}
          {isBundled ? (
            <DropdownMenuItem
              onClick={() => {
                setShowBundledCourses(false);
                navigate("/", { replace: true });
              }}
            >
              <EyeOff aria-hidden="true" />
              {t("courseSearch.hideCourse")}
            </DropdownMenuItem>
          ) : (
            <>
              {destructiveItems}
              <DropdownMenuItem onClick={() => setIsRemoveOpen(true)} variant="destructive">
                <Trash2 aria-hidden="true" />
                {t("courseSearch.removeCourse")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <RemoveCourseDialog
        course={isRemoveOpen ? course : null}
        onOpenChange={setIsRemoveOpen}
        onRemoved={() => navigate(afterRemovePath, { replace: true })}
      />
    </>
  );
}
