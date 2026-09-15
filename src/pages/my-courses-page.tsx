import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";
import { PageActions } from "@/components/page-actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";

export const CreateCourseAction = () => {
  const { t } = useTranslation();

  return (
    <Button className="gap-2" render={<Link to="/courses/new" />}>
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
      actions={
        <PageActions>
          <CreateCourseAction />
        </PageActions>
      }
    >
      <ErrorBoundary fallback={<CourseErrorCard message={t("myCourses.error")} />}>
        <PageHeader
          right={
            <PageActions>
              <CreateCourseAction />
            </PageActions>
          }
          subtitle={
            <CardDescription className="max-w-3xl">
              {t("myCourses.description")}
            </CardDescription>
          }
          title={<CardTitle size="lg">{t("myCourses.title")}</CardTitle>}
        />
        <CourseSearchField
          onChange={setQuery}
          placeholder={t("myCourses.searchPlaceholder")}
          value={query}
        />
        <CourseList
          distribution="local"
          emptyMessage={t("myCourses.empty")}
          query={query}
          routeBuilder={(courseId) => `/drafts/${courseId}`}
        />
      </ErrorBoundary>
    </PageContent>
  );
}
