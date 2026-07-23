import { useTranslation } from "react-i18next";
import { Navigate, useMatch, useParams } from "react-router-dom";

import { CoursePlayer } from "@/components/course-player";
import { CourseErrorCard } from "@/components/course-error-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageContent } from "@/components/page-content";
import { useAppState } from "@/lib/use-app-state";

export const CoursePlayerPage = () => {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const isTestRoute =
    useMatch("/courses/:courseId/lessons/:lessonId/test") !== null;
  const { locale } = useAppState();
  const { t } = useTranslation();

  if (!courseId || !lessonId) {
    return <Navigate replace to="/" />;
  }

  return (
    <main className="min-h-screen bg-stone-100/80 p-4">
      <PageContent>
        <ErrorBoundary
          fallback={<CourseErrorCard message={t("courseDetails.error")} />}
          key={`${courseId}-${lessonId}-${isTestRoute}-${locale}`}
        >
          <CoursePlayer
            courseId={courseId}
            isTestRoute={isTestRoute}
            lessonId={lessonId}
          />
        </ErrorBoundary>
      </PageContent>
    </main>
  );
};
