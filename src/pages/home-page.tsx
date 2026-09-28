import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { ImportCourseDialog } from "@/components/course-search/import-course-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import { Home } from "@/components/home/home";
import { PageContent } from "@/components/page-content";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";

export const HomePage = () => {
  const { t } = useTranslation();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const actions = (
    <Button
      className="gap-2"
      onClick={() => setIsImportOpen(true)}
      variant="secondary"
    >
      <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{t("importCourse.openButton")}</span>
    </Button>
  );

  return (
    <PageContent
      actions={actions}
      pageHero={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("courseSearch.title")}</CardTitle>
          <CardDescription className="max-w-3xl">
            {t("courseSearch.subtitle")}
          </CardDescription>
        </div>
      }
    >
      <ErrorBoundary
        fallback={<CourseErrorCard message={t("courseSearch.error")} />}
      >
        <Home />
        <ImportCourseDialog onOpenChange={setIsImportOpen} open={isImportOpen} />
      </ErrorBoundary>
    </PageContent>
  );
};
