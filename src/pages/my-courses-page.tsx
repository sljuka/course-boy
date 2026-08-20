import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";
import { PageActions } from "@/components/page-actions";
import { PageHeader } from "@/components/page-header";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { HomePageActions } from "@/pages/home-page";

export function MyCoursesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <PageContent>
      <ErrorBoundary fallback={<CourseErrorCard message={t("myCourses.error")} />}>
        <PageHeader
          right={
            <PageActions>
              <HomePageActions />
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
          emptyMessage={t("myCourses.empty")}
          query={query}
          status="published"
        />
      </ErrorBoundary>
    </PageContent>
  );
}
