import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { CourseCard } from "@/components/course-search/course-card";
import { RemoveCourseDialog } from "@/components/course-search/remove-course-dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { CourseSummary } from "@/lib/course-package";
import { useCoursesQuery } from "@/lib/course-queries";
import { useAppState } from "@/lib/use-app-state";

export const CourseList = ({ query }: { query: string }) => {
  const { locale } = useAppState();
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useCoursesQuery(locale, {
    throwOnError: true,
  });
  const [coursePendingRemoval, setCoursePendingRemoval] =
    useState<CourseSummary | null>(null);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      return [course.title, course.description, course.id].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [courses, query]);

  if (isLoading) {
    return <CourseLoadingCard message={t("courseSearch.loading")} />;
  }

  if (filteredCourses.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10 text-sm text-stone-600">
          {t("courseSearch.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {filteredCourses.map((course) => (
        <CourseCard
          course={course}
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
