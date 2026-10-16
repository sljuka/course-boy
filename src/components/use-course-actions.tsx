import { EyeOff, FolderOpen, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ClearProgressDialog } from "@/components/course-progress/clear-progress-dialog";
import { RemoveCourseDialog } from "@/components/course-search/remove-course-dialog";
import type { CourseDistribution } from "@/lib/course-package";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { useShowBundledCourses } from "@/lib/show-bundled-courses-queries";

export type CourseActionsCourse = { distribution?: CourseDistribution; id: string; isBuiltIn?: boolean; title: string };

// One of a course's own actions, drawn by whichever menu shows it.
export type CourseAction = {
  destructive?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  id: string;
  label: string;
  onSelect: () => void;
  testId?: string;
};

// A course's own actions, shared by its ⋯ menu and its right-click menu (on
// lists, SLJ-12), so both always offer the same: Open in file system for an
// imported course, Clear course progress (off while there's none; it keeps
// the star), then Hide for the bundled course or Remove course, which asks
// first and then leaves for `afterRemovePath` (the course is gone).
// `dialogs` must be rendered next to the menu.
export function useCourseActions(course: CourseActionsCourse, afterRemovePath: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isClearProgressOpen, setIsClearProgressOpen] = useState(false);
  const { data: progress } = useCourseProgressQuery();
  const courseProgress = progress?.courses[course.id];
  const hasProgress = Boolean(courseProgress?.startedAt) || Object.keys(courseProgress?.steps ?? {}).length > 0;
  const [, setShowBundledCourses] = useShowBundledCourses();
  // The bundled course (Getting Started) is hidden, not deleted: the same
  // switch as Settings' "Show Getting Started course", so it can come back.
  const isBundled = course.isBuiltIn === true;

  const actions: CourseAction[] = [
    // A course you imported: its files, like the explorer's "Open in file
    // system" on your own courses (same icon).
    ...(course.distribution === "imported"
      ? [
          {
            icon: FolderOpen,
            id: "open-in-file-system",
            label: t("courseSearch.openInFileSystem"),
            onSelect: () => void window.courses.openInFileSystem(course.id),
          },
        ]
      : []),
    {
      disabled: !hasProgress,
      icon: RotateCcw,
      id: "clear-progress",
      label: t("courseSearch.clearProgress"),
      onSelect: () => setIsClearProgressOpen(true),
      testId: "clear-course-progress",
    },
  ];
  const finalAction: CourseAction = isBundled
    ? {
        icon: EyeOff,
        id: "hide",
        label: t("courseSearch.hideCourse"),
        onSelect: () => {
          setShowBundledCourses(false);
          navigate("/", { replace: true });
        },
      }
    : {
        destructive: true,
        icon: Trash2,
        id: "remove",
        label: t("courseSearch.removeCourse"),
        onSelect: () => setIsRemoveOpen(true),
      };

  const dialogs = (
    <>
      <ClearProgressDialog course={isClearProgressOpen ? course : null} onOpenChange={setIsClearProgressOpen} />
      <RemoveCourseDialog
        course={isRemoveOpen ? course : null}
        onOpenChange={setIsRemoveOpen}
        onRemoved={() => navigate(afterRemovePath, { replace: true })}
      />
    </>
  );

  return { actions, dialogs, finalAction };
}
