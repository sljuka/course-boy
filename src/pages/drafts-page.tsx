import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";
import { PageHeader } from "@/components/page-header";
import { CardDescription, CourseTitle } from "@/components/ui/card";

export function DraftsPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  return (
    <PageContent>
      <ErrorBoundary fallback={<CourseErrorCard message={t("drafts.error")} />}>
        <PageHeader
          subtitle={
            <CardDescription className="max-w-3xl text-base text-stone-700">
              {t("drafts.description")}
            </CardDescription>
          }
          title={<CourseTitle>{t("drafts.title")}</CourseTitle>}
        />
        <CourseSearchField
          onChange={setQuery}
          placeholder={t("drafts.searchPlaceholder")}
          value={query}
        />
        <CourseList
          emptyMessage={t("drafts.empty")}
          query={query}
          routeBuilder={(courseId) => `/drafts/${courseId}`}
          status="draft"
        />
      </ErrorBoundary>
    </PageContent>
  );
}
