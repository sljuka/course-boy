import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CourseFavoriteToggle } from "@/components/course-progress/course-favorite-toggle";
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
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { parseCourseSearchQuery } from "@/lib/course-search-query";
import { useAppState } from "@/lib/use-app-state";

type CourseGroupId = "finished" | "imported" | "started";

// Home's course groups, in order, with their header icon.
const COURSE_GROUPS = [
  { icon: "changed", id: "started", titleKey: "home.groups.started" },
  { icon: "published", id: "imported", titleKey: "home.groups.imported" },
  { icon: "done", id: "finished", titleKey: "home.groups.finished" },
] as const satisfies { icon: string; id: CourseGroupId; titleKey: string }[];

// The courses a student learns from, grouped Linear-style (SLJ-49):
// - Downloading: imports still running (progress, Cancel) or failed (Dismiss);
//   a course moves to Imported as soon as it has landed;
// - then, from the student's progress (SLJ-50), each course in one group:
//   Started (most recently opened first), Imported (not started yet),
//   Finished (most recently finished first). Starring doesn't move a course:
//   `:favorites` in the search shows only starred ones, in whatever group.
// The course groups hold courses imported with a code, plus the bundled
// tutorial (badged "Built in") unless it's hidden in Settings.
// Search (course-search-query.ts) filters the course groups. `view` only changes how each one is drawn:
// compact rows ("table") or cards ("list").
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
  const { data: progress } = useCourseProgressQuery();

  const imported = useMemo<CourseSummary[]>(() => {
    const { favoritesOnly, text } = parseCourseSearchQuery(query);
    return courses.filter(
      (course) =>
        (course.distribution === "imported" || (showBundledCourses && course.distribution === "bundled")) &&
        (!favoritesOnly || progress?.courses[course.id]?.favorite === true) &&
        (!text ||
          [course.title, course.description, course.id].some((value) =>
            value.toLowerCase().includes(text),
          )),
    );
  }, [courses, progress, query, showBundledCourses]);

  const groups = useMemo(() => {
    const byGroup: Record<CourseGroupId, CourseSummary[]> = { finished: [], imported: [], started: [] };
    const summaries = new Map(
      imported.map((course) => [course.id, summarizeCourseProgress(course.stepIds, progress?.courses[course.id])]),
    );

    for (const course of imported) {
      const courseProgress = progress?.courses[course.id];
      const group: CourseGroupId = summaries.get(course.id)?.completedAt
        ? "finished"
        : courseProgress?.startedAt
          ? "started"
          : "imported";
      byGroup[group].push(course);
    }

    const newestFirst = (date: (course: CourseSummary) => string | null | undefined) => (left: CourseSummary, right: CourseSummary) =>
      (date(right) ?? "").localeCompare(date(left) ?? "");
    byGroup.started.sort(newestFirst((course) => progress?.courses[course.id]?.lastOpenedAt));
    byGroup.finished.sort(newestFirst((course) => summaries.get(course.id)?.completedAt));

    return byGroup;
  }, [imported, progress]);

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
      {COURSE_GROUPS.map(
        ({ icon, id, titleKey }) =>
          groups[id].length > 0 && (
            <ListGroup data-testid={`home-group-${id}`} key={id}>
              <ListGroupHeader count={groups[id].length} icon={<StatusIcon status={icon} />} title={t(titleKey)} />
              <ListGroupContent className={contentClassName}>
                {groups[id].map((course) => {
                  const update = updates[course.id]?.visibility === "prominent" ? updates[course.id] : undefined;
                  const courseProgress = progress?.courses[course.id];
                  const summary = summarizeCourseProgress(course.stepIds, courseProgress);
                  return view === "list" ? (
                    <CourseCard
                      course={course}
                      href={`/courses/${course.id}`}
                      key={course.id}
                      leading={<CourseFavoriteToggle courseId={course.id} />}
                      progress={{ isStarted: Boolean(courseProgress?.startedAt), summary }}
                      update={update}
                    />
                  ) : (
                    <HomeCourseRow
                      course={course}
                      isStarted={Boolean(courseProgress?.startedAt)}
                      key={course.id}
                      summary={summary}
                      update={update}
                    />
                  );
                })}
              </ListGroupContent>
            </ListGroup>
          ),
      )}
    </div>
  );
}
