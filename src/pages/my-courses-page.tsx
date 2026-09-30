import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseErrorCard } from "@/components/course-error-card";
import { CourseSearchField } from "@/components/course-search/course-search-field";
import { ErrorBoundary } from "@/components/error-boundary";
import { MyCoursesList } from "@/components/my-courses/my-courses-list";
import { ViewOptionsMenu } from "@/components/my-courses/view-options-menu";
import { Page } from "@/components/page/page";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { useMyCoursesView } from "@/lib/course-list-view-queries";

export const CreateCourseAction = () => {
  const { t } = useTranslation();

  return (
    <Button
      nativeButton={false}
      render={<Link to="/courses/new" />}
      size="sm"
      title={t("sidebar.createCourse")}
    >
      <Plus aria-hidden="true" />
      <ButtonLabel>{t("sidebar.createCourse")}</ButtonLabel>
    </Button>
  );
};

export function MyCoursesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [view, setView] = useMyCoursesView();

  return (
    <Page
      actionBarStart={<ViewOptionsMenu onViewChange={setView} view={view} />}
      actions={<CreateCourseAction />}
      breadcrumbs={[{ icon: BookOpen, label: t("sidebar.myCourses") }]}
      header={
        <div className="flex flex-col gap-1">
          <CardTitle size="lg">{t("myCourses.title")}</CardTitle>
          <CardDescription className="max-w-3xl">
            {t("myCourses.description")}
          </CardDescription>
        </div>
      }
    >
      <ErrorBoundary fallback={<CourseErrorCard message={t("myCourses.error")} />}>
        <CourseSearchField
          onChange={setQuery}
          placeholder={t("myCourses.searchPlaceholder")}
          value={query}
        />
        <MyCoursesList query={query} view={view} />
      </ErrorBoundary>
    </Page>
  );
}
