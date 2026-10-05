import { Download, Home as HomeIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { ImportCourseDialog } from "@/components/course-search/import-course-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import { Home } from "@/components/home/home";
import { ViewOptionsMenu } from "@/components/my-courses/view-options-menu";
import { Page } from "@/components/page/page";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { useHomeView } from "@/lib/course-list-view-queries";

export const HomePage = () => {
  const { t } = useTranslation();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [view, setView] = useHomeView();

  const actions = (
    <Button
      onClick={() => setIsImportOpen(true)}
      size="sm"
      title={t("importCourse.openButton")}
      variant="secondary"
    >
      <Download aria-hidden="true" />
      <ButtonLabel>{t("importCourse.openButton")}</ButtonLabel>
    </Button>
  );

  return (
    <Page
      actionBarStart={<ViewOptionsMenu onViewChange={setView} view={view} />}
      actions={actions}
      breadcrumbs={[{ icon: HomeIcon, label: t("sidebar.home") }]}
      header={
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
        <Home view={view} />
        <ImportCourseDialog onOpenChange={setIsImportOpen} open={isImportOpen} />
      </ErrorBoundary>
    </Page>
  );
};
