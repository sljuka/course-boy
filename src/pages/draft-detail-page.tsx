import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { DraftDetails } from "@/components/draft-details/draft-details";
import { CourseErrorCard } from "@/components/course-error-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";

export function DraftDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();

  if (!courseId) {
    return <Navigate replace to="/drafts" />;
  }

  return (
    <PageContent>
      <ErrorBoundary
        fallback={<CourseErrorCard message={t("draftDetails.error")} />}
        key={courseId}
      >
        <DraftDetails courseId={courseId} />
      </ErrorBoundary>
    </PageContent>
  );
}
