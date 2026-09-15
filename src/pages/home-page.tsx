import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { ImportCourseDialog } from "@/components/course-search/import-course-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import { Home } from "@/components/home/home";
import { PageContent } from "@/components/page-content";
import { PageActions } from "@/components/page-actions";
import { Button } from "@/components/ui/button";

export const HomePage = () => {
  const { t } = useTranslation();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const actions = (
    <PageActions>
      <Button
        className="gap-2"
        onClick={() => setIsImportOpen(true)}
        variant="secondary"
      >
        <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{t("importCourse.openButton")}</span>
      </Button>
    </PageActions>
  );

  return (
    <PageContent actions={actions}>
      <ErrorBoundary
        fallback={<CourseErrorCard message={t("courseSearch.error")} />}
      >
        <Home actions={actions} />
        <ImportCourseDialog onOpenChange={setIsImportOpen} open={isImportOpen} />
      </ErrorBoundary>
    </PageContent>
  );
};
