import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { Home } from "@/components/home/home";
import { PageContent } from "@/components/page-content";
import { PageActions } from "@/components/page-actions";
import { Button } from "@/components/ui/button";

export const HomePageActions = () => {
  const { t } = useTranslation();

  return (
    <Button className="gap-2" render={<Link to="/courses/new" />}>
      <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{t("sidebar.createCourse")}</span>
    </Button>
  );
};

export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <PageContent>
      <ErrorBoundary
        fallback={<CourseErrorCard message={t("courseSearch.error")} />}
      >
        <Home
          actions={
            <PageActions>
              <HomePageActions />
            </PageActions>
          }
        />
      </ErrorBoundary>
    </PageContent>
  );
};
