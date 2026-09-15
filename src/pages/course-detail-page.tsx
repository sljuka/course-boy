import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { CourseDetails } from "@/components/course-details/course-details";
import { CourseErrorCard } from "@/components/course-error-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();

  if (!courseId) {
    return <Navigate replace to="/" />;
  }

  return (
    <ErrorBoundary
      fallback={
        <PageContent>
          <CourseErrorCard message={t("courseDetails.error")} />
        </PageContent>
      }
      key={courseId}
    >
      <CourseDetails courseId={courseId} />
    </ErrorBoundary>
  );
};
