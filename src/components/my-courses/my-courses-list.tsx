import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CourseCard } from "@/components/course-search/course-card";
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
  const { data: courses = [], isLoading } = useCoursesQuery(locale, { throwOnError: true });

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
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10">
          <CardDescription>{t("myCourses.empty")}</CardDescription>
        </CardContent>
      </Card>
    );
  }

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
            <ListGroupContent className={view === "list" ? "gap-3 pt-3" : undefined}>
              {group.courses.map((course) =>
                view === "list" ? (
                  <CourseCard
                    course={course}
                    href={`/drafts/${course.id}`}
                    key={course.id}
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
