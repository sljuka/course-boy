import { Navigate, useParams } from "react-router-dom";

import { TestPlayer } from "@/components/course-player";
import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";

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
