import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CourseCard } from "@/components/course-search/course-card";
import { HomeCourseRow } from "@/components/home/home-course-row";
import { PendingImportCard } from "@/components/home/pending-import-card";
import { PendingImportRow } from "@/components/home/pending-import-row";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseListView } from "@/lib/course-list-view";
import type { CourseSummary } from "@/lib/course-package";
import { useCoursesQuery } from "@/lib/course-queries";
import { useCourseUpdatesQuery, usePendingImports } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";

// The courses a student learns from, grouped Linear-style (SLJ-49):
// - Downloading: imports still running (progress, Cancel) or failed (Dismiss);
//   a course moves to Imported as soon as it has landed;
// - Imported: courses imported with a code, plus the bundled tutorial (badged
//   "Built in"), unless it's hidden in Settings.
// Search filters the course groups. `view` only changes how each one is drawn:
// compact rows ("table") or cards ("list").
// Later: Started and Finished groups, from the student's progress.
export function HomeCourseList({
  query,
  showBundledCourses,
  view,
}: {
  query: string;
  showBundledCourses: boolean;
  view: CourseListView;
}) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: courses = [], isLoading } = useCoursesQuery(locale, { throwOnError: true });
  // Updates to imported courses; quiet ones (after "Finish on this version")
  // only show on the course's own page.
  const { data: updates = {} } = useCourseUpdatesQuery();
  const pendingImports = usePendingImports();

  const imported = useMemo<CourseSummary[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courses.filter(
      (course) =>
        (course.distribution === "imported" || (showBundledCourses && course.distribution === "bundled")) &&
        (!normalizedQuery ||
          [course.title, course.description, course.id].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          )),
    );
  }, [courses, query, showBundledCourses]);

  if (isLoading) {
    return <CourseLoadingCard message={t("courseSearch.loading")} />;
  }

  if (pendingImports.length === 0 && imported.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10">
          <CardDescription>{t("courseSearch.empty")}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  const contentClassName = view === "list" ? "gap-3 pt-3" : undefined;

  return (
    <div className="flex flex-col gap-2">
      {pendingImports.length > 0 && (
        <ListGroup data-testid="home-group-downloading">
          <ListGroupHeader
            count={pendingImports.length}
            icon={<StatusIcon status="downloading" />}
            title={t("home.groups.downloading")}
          />
          <ListGroupContent className={contentClassName}>
            {pendingImports.map((pendingImport) =>
              view === "list" ? (
                <PendingImportCard key={pendingImport.transferId} pendingImport={pendingImport} />
              ) : (
                <PendingImportRow key={pendingImport.transferId} pendingImport={pendingImport} />
              ),
            )}
          </ListGroupContent>
        </ListGroup>
      )}
      {imported.length > 0 && (
        <ListGroup data-testid="home-group-imported">
          <ListGroupHeader
            count={imported.length}
            icon={<StatusIcon status="published" />}
            title={t("home.groups.imported")}
          />
          <ListGroupContent className={contentClassName}>
            {imported.map((course) => {
              const update = updates[course.id]?.visibility === "prominent" ? updates[course.id] : undefined;
              return view === "list" ? (
                <CourseCard course={course} href={`/courses/${course.id}`} key={course.id} update={update} />
              ) : (
                <HomeCourseRow course={course} key={course.id} update={update} />
              );
            })}
          </ListGroupContent>
        </ListGroup>
      )}
    </div>
  );
}
