import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseSearch } from "@/components/course-search/course-search";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";

export const CourseSearchPage = () => {
  const { t } = useTranslation();

  return (
    <PageContent>
      <ErrorBoundary fallback={<CourseErrorCard message={t("courseSearch.error")} />}>
        <CourseSearch />
      </ErrorBoundary>
    </PageContent>
  );
};
