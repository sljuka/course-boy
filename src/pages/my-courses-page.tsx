import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseList } from "@/components/course-search/course-list";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { ImportCourseDialog } from "@/components/course-search/import-course-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";
import { PageActions } from "@/components/page-actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { HomePageActions } from "@/pages/home-page";

export function MyCoursesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <PageContent>
      <ErrorBoundary fallback={<CourseErrorCard message={t("myCourses.error")} />}>
        <PageHeader
          right={
            <PageActions>
              <Button
                className="gap-2"
                onClick={() => setIsImportOpen(true)}
                variant="secondary"
              >
                <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{t("importCourse.openButton")}</span>
              </Button>
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
        <ImportCourseDialog onOpenChange={setIsImportOpen} open={isImportOpen} />
      </ErrorBoundary>
    </PageContent>
  );
}
