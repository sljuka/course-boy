import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseLessonContent } from "@/components/course-player/course-lesson-content";
import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { PageHeader } from "@/components/page-header";
import { CardDescription, LessonTitle } from "@/components/ui/card";
import { buildLessonTestPath } from "@/lib/course-utils";

export function LessonPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <CoursePlayerShell
      courseId={courseId}
      lessonId={lessonId}
    >
      {({
        activeLesson,
        courseTitle,
        moveToNextLesson,
        progressCurrent,
        progressTotal,
        sectionTitle,
      }) => (
        <>
          <PageHeader
            title={<LessonTitle>{courseTitle}</LessonTitle>}
            subtitle={
              <CardDescription className="text-base text-stone-600">
                {sectionTitle}
                {" · "}
                {t("courseDetails.progress", {
                  current: progressCurrent,
                  total: progressTotal,
                })}
              </CardDescription>
            }
            right={
              <CoursePlayerActions
                courseId={courseId}
                isRefreshingAvailable={false}
                onPrintCourse={() => window.print()}
                onRefreshExercise={() => {}}
              />
            }
          />
          <CourseLessonContent
            activeLesson={activeLesson}
            onContinueFromLesson={(lesson) => {
              if (!lesson.test || lesson.test.exercises.length === 0) {
                moveToNextLesson();
                return;
              }

              navigate(buildLessonTestPath(courseId, lesson.id));
            }}
          />
        </>
      )}
    </CoursePlayerShell>
  );
}
