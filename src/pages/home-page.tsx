import { Download, Home as HomeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { CourseErrorCard } from "@/components/course-error-card";
import { ImportCourseDialog } from "@/components/course-search/import-course-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import { Home } from "@/components/home/home";
import { ViewOptionsMenu } from "@/components/my-courses/view-options-menu";
import { Page } from "@/components/page/page";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { isShareCode } from "@/lib/app-links";
import { useHomeView } from "@/lib/course-list-view-queries";

export const HomePage = () => {
  const { t } = useTranslation();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [view, setView] = useHomeView();
  // `/?import=<code>`: a `matko://import/…` link (SLJ-8) opens Import with
  // the code filled in. Taken out of the address, so Back doesn't reopen it.
  const [searchParams, setSearchParams] = useSearchParams();
  const [linkedCode, setLinkedCode] = useState<string | null>(null);
  const importParam = searchParams.get("import");
  useEffect(() => {
    if (importParam === null) return;
    if (isShareCode(importParam)) {
      setLinkedCode(importParam);
      setIsImportOpen(true);
    }
    setSearchParams({}, { replace: true });
  }, [importParam, setSearchParams]);

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
        <ImportCourseDialog
          initialCode={linkedCode}
          onOpenChange={(open) => {
            setIsImportOpen(open);
            if (!open) setLinkedCode(null);
          }}
          open={isImportOpen}
        />
      </ErrorBoundary>
    </Page>
  );
};
