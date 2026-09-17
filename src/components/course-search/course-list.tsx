import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CourseCard } from "@/components/course-search/course-card";
import { RemoveCourseDialog } from "@/components/course-search/remove-course-dialog";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import type { CourseDistribution, CourseSummary } from "@/lib/course-package";
import { useCoursesQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

export const CourseList = ({
  distribution,
  emptyMessage,
  query,
  routeBuilder = (courseId) => `/courses/${courseId}`,
}: {
  distribution?: CourseDistribution;
  emptyMessage?: string;
  query: string;
  routeBuilder?: (courseId: string) => string;
}) => {
  const { locale } = useAppState();
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useCoursesQuery(locale, {
    throwOnError: true,
  });
  const [coursePendingRemoval, setCoursePendingRemoval] =
    useState<CourseSummary | null>(null);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const distributionFilteredCourses =
      typeof distribution === "undefined"
        ? courses
        : courses.filter((course) => course.distribution === distribution);

    if (!normalizedQuery) {
      return distributionFilteredCourses;
    }

    return distributionFilteredCourses.filter((course) => {
      return [course.title, course.description, course.id].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [courses, distribution, query]);

  if (isLoading) {
    return <CourseLoadingCard message={t("courseSearch.loading")} />;
  }

  if (filteredCourses.length === 0) {
    return (
        <Card className="overflow-hidden">
        <CardContent className="py-10">
          <CardDescription>{emptyMessage ?? t("courseSearch.empty")}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {filteredCourses.map((course) => (
        <CourseCard
          course={course}
          href={routeBuilder(course.id)}
          key={course.id}
          onRemove={(selectedCourse) => {
            setCoursePendingRemoval(selectedCourse);
          }}
        />
      ))}
      <RemoveCourseDialog
        course={coursePendingRemoval}
        onOpenChange={(open) => {
          if (!open) {
            setCoursePendingRemoval(null);
          }
        }}
      />
    </>
  );
};
