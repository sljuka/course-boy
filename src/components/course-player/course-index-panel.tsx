import { useMemo, type ReactNode } from "react";
import { FileText, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";
import { buildSectionPreviewItems } from "@/components/course-preview-strip-items";
import { StepProgressBadge } from "@/components/course-progress/step-progress-badge";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import type { CourseDetails } from "@/lib/course-package";
import type { CourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { buildLessonPath, buildLessonTestPath } from "@/lib/course-utils";
import { useSidePanelPreference } from "@/lib/explorer-panel-queries";
import { PageSidePanelsContext, type PageSidePanels } from "@/lib/use-page-side-panel";
import { useAppState } from "@/lib/use-app-state";

// Gives a player's page (`Page`, inside) its left panel, the course index
// (SLJ-158): the course's sections with their intros, lessons and tests, the
// one open now marked, each with the student's progress, any of them a click
// away. Open or closed as last left (the `courseIndexPanel` preference). Kept
// in full screen (`keepsInFullScreen`); `Page` hides it in print and makes it
// a drawer on narrow windows.
// None when the teacher switched it off (`courseIndex` in course.json) or in
// a teacher's preview, which has no course of its own to index.
export function CourseIndexSidePanel({
  children,
  courseId,
  currentItemId,
  isPreview,
}: {
  children: ReactNode;
  courseId: string;
  // The lesson, section intro or test open now (a lesson's test by its test id).
  currentItemId: string;
  isPreview: boolean;
}) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: course } = useCourseDetailsQuery(isPreview ? undefined : courseId, locale);
  const { data: progress } = useCourseProgressQuery();
  const [panel, updatePanel] = useSidePanelPreference("courseIndexPanel");
  const isShown = !isPreview && course?.courseIndex === true;

  const sidePanels = useMemo<PageSidePanels>(
    () =>
      isShown && course
        ? {
            left: {
              content: (
                <CourseIndex course={course} currentItemId={currentItemId} progress={progress?.courses[courseId]} />
              ),
              // As a drawer, it closes once another item opens.
              dismissKey: currentItemId,
              keepsInFullScreen: true,
              label: t("courseIndex.title"),
              onOpenChange: (open) => updatePanel({ open }),
              open: panel.open,
              toggleLabel: t("courseIndex.toggle"),
            },
          }
        : {},
    [course, courseId, currentItemId, isShown, panel.open, progress, t, updatePanel],
  );

  return <PageSidePanelsContext.Provider value={sidePanels}>{children}</PageSidePanelsContext.Provider>;
}

function CourseIndex({
  course,
  currentItemId,
  progress,
}: {
  course: CourseDetails;
  currentItemId: string;
  progress: CourseProgress | undefined;
}) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("courseIndex.title")} className="flex flex-col gap-1 p-2" data-testid="course-index">
      {course.sections.map((section) => {
        const items = buildSectionPreviewItems(section, {
          courseGradeBands: course.gradeBands,
          introTitle: t("courseDetails.sectionIntro"),
        });
        // The section open now starts expanded; the others show their title.
        const isCurrentSection = items.some((item) => item.id === currentItemId);
        return (
          <ListGroup defaultOpen={isCurrentSection} key={section.id}>
            <ListGroupHeader count={items.length} current={isCurrentSection} title={section.title} variant="subtle" />
            <ListGroupContent>
              {items.map((item) => (
                <CourseIndexRow
                  courseId={course.id}
                  isCurrent={item.id === currentItemId}
                  item={item}
                  key={item.id}
                  progress={progress}
                />
              ))}
            </ListGroupContent>
          </ListGroup>
        );
      })}
    </nav>
  );
}

function CourseIndexRow({
  courseId,
  isCurrent,
  item,
  progress,
}: {
  courseId: string;
  isCurrent: boolean;
  item: CoursePreviewStripItem;
  progress: CourseProgress | undefined;
}) {
  const { t } = useTranslation();
  const targetLessonId = item.targetLessonId ?? item.id;
  // A lesson's own test sits under its lesson (its title is its id).
  const isLessonTest = item.kind === "test" && item.targetLessonId !== undefined;
  const Icon = item.kind === "test" ? FlaskConical : FileText;

  return (
    <ListRow className={isLessonTest ? "pl-7" : undefined} data-testid="course-index-item" selected={isCurrent}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <ListRowLink
        aria-current={isCurrent ? "page" : undefined}
        render={
          <Link
            to={item.kind === "test" ? buildLessonTestPath(courseId, targetLessonId) : buildLessonPath(courseId, targetLessonId)}
          />
        }
      >
        {isLessonTest ? t("courseIndex.lessonTest") : item.title}
      </ListRowLink>
      <ListRowMeta align="end">
        <StepProgressBadge gradeBands={item.gradeBands} step={progress?.steps[item.id]} />
      </ListRowMeta>
    </ListRow>
  );
}
