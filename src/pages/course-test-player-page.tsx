import { Navigate, useParams } from "react-router-dom";

import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";
import { TestPlayer } from "@/components/test-player";

export const CourseTestPlayerPage = () => {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  if (!courseId || !lessonId) {
    return <Navigate replace to="/" />;
  }

  return (
    <CoursePlayerPageLayout playerKey={`${courseId}-${lessonId}-test`}>
      <TestPlayer courseId={courseId} lessonId={lessonId} />
    </CoursePlayerPageLayout>
  );
};
