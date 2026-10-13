import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CourseCard } from "@/components/course-search/course-card";
import { CourseStatusIcon } from "@/components/my-courses/course-status-icon";
import { MyCourseRow } from "@/components/my-courses/my-course-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { ListGroup, ListGroupContent, ListGroupHeader } from "@/components/ui/list-group";
import { StatusIcon } from "@/components/ui/status-icon";
import type { CourseListView } from "@/lib/course-list-view";
import type { CourseSummary } from "@/lib/course-package";
import { useCoursesQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

type Group = { courses: CourseSummary[]; key: "published" | "local" };

// Your own courses, grouped Linear-style: Published (a version is marked
// published) and Local (never published). Each course is in exactly one group;
// search filters both. Newest edit first. `view` only changes how each course
// is drawn: compact rows ("table") or cards ("list").
export function MyCoursesList({ query, view }: { query: string; view: CourseListView }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  // Watched: a course you maintain with others lands here on its own once its
  // first shared version is approved (SLJ-11).
  const { data: courses = [], isLoading } = useCoursesQuery(locale, { throwOnError: true, watch: true });

  const groups = useMemo<Group[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const mine = courses
      .filter((course) => course.distribution === "local")
      .filter(
        (course) =>
          !normalizedQuery ||
          [course.title, course.description, course.id].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          ),
      )
      .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));

    return [
      { courses: mine.filter((course) => course.publishedVersion !== null), key: "published" },
      { courses: mine.filter((course) => course.publishedVersion === null), key: "local" },
    ];
  }, [courses, query]);

  if (isLoading) {
    return <CourseLoadingCard message={t("courseSearch.loading")} />;
  }

  if (groups.every((group) => group.courses.length === 0)) {
    // No courses of yours at all (not just none matching the search): the
    // way to make the first one, right under the text.
    const hasNone = !courses.some((course) => course.distribution === "local");
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <CardDescription>{hasNone ? t("myCourses.none") : t("myCourses.empty")}</CardDescription>
          {hasNone && (
            <Button data-testid="empty-create-course" nativeButton={false} render={<Link to="/courses/new" />} size="sm">
              <Plus aria-hidden="true" />
              {t("sidebar.createCourse")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Rows stacked, full-width cards, or small cards wrapping 1-4 per row (SLJ-64).
  const contentClassName =
    view === "cards"
      ? "grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : view === "list"
        ? "gap-3 pt-3"
        : undefined;

  return (
    <div className="flex flex-col gap-2">
      {groups
        .filter((group) => group.courses.length > 0)
        .map((group) => (
          <ListGroup key={group.key}>
            <ListGroupHeader
              action={
                group.key === "local" && (
                  <Button
                    aria-label={t("sidebar.createCourse")}
                    nativeButton={false}
                    render={<Link to="/courses/new" />}
                    size="icon-xs"
                    title={t("sidebar.createCourse")}
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                )
              }
              count={group.courses.length}
              icon={<StatusIcon status={group.key} />}
              title={t(`myCourses.groups.${group.key}`)}
            />
            <ListGroupContent className={contentClassName}>
              {group.courses.map((course) =>
                view !== "table" ? (
                  <CourseCard
                    compact={view === "cards"}
                    course={course}
                    href={`/drafts/${course.id}`}
                    key={course.id}
                    leading={<CourseStatusIcon course={course} />}
                  />
                ) : (
                  <MyCourseRow
                    course={course}
                    key={course.id}
                    locale={locale}
                  />
                ),
              )}
            </ListGroupContent>
          </ListGroup>
        ))}
    </div>
  );
}
