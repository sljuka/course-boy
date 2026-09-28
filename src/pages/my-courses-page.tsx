import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";

// Only courses you author (they have a draft).
const authoredDistributions = ["local"] as const;

export const CreateCourseAction = () => {
  const { t } = useTranslation();

  return (
    <Button className="gap-2" nativeButton={false} render={<Link to="/courses/new" />}>
      <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{t("sidebar.createCourse")}</span>
    </Button>
  );
};

export function MyCoursesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <PageContent
      actions={<CreateCourseAction />}
      breadcrumbs={[{ icon: BookOpen, label: t("sidebar.myCourses") }]}
      pageHero={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("myCourses.title")}</CardTitle>
          <CardDescription className="max-w-3xl">
            {t("myCourses.description")}
          </CardDescription>
        </div>
      }
    >
      <ErrorBoundary fallback={<CourseErrorCard message={t("myCourses.error")} />}>
        <CourseSearchField
          onChange={setQuery}
          placeholder={t("myCourses.searchPlaceholder")}
          value={query}
        />
        <CourseList
          distributions={authoredDistributions}
          emptyMessage={t("myCourses.empty")}
          query={query}
          routeBuilder={(courseId) => `/drafts/${courseId}`}
        />
      </ErrorBoundary>
    </PageContent>
  );
}
