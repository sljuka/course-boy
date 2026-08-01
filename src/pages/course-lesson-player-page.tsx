import { Navigate, useParams } from "react-router-dom";

import { CoursePlayerPageLayout } from "@/components/course-player-page-layout";
import { LessonPlayer } from "@/components/lesson-player";

export const CourseLessonPlayerPage = () => {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  if (!courseId || !lessonId) {
    return <Navigate replace to="/" />;
  }

  return (
    <CoursePlayerPageLayout playerKey={`${courseId}-${lessonId}-lesson`}>
      <LessonPlayer courseId={courseId} lessonId={lessonId} />
    </CoursePlayerPageLayout>
  );
};
