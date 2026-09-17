import { useState } from "react";
import { Printer } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseLessonContent } from "@/components/course-player/course-lesson-content";
import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { useCoursePlayer } from "@/components/course-player/use-course-player";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { defaultLessonPrintOptions } from "@/lib/print-options";
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
  const [printOptions, setPrintOptions] = useState(defaultLessonPrintOptions);
  const playerState = useCoursePlayer({ courseId, lessonId });

  if (playerState.status !== "ready") {
    return <CoursePlayerShell playerState={playerState} />;
  }

  // This route has no document to show for a standalone test — send the
  // reader straight to its test instead.
  if (playerState.activeStep.kind === "test") {
    return (
      <Navigate
        replace
        to={buildLessonTestPath(courseId, playerState.activeStep.item.id)}
      />
    );
  }

  const activeLesson = playerState.activeStep.item;

  return (
    <CoursePlayerShell playerState={playerState}>
      <>
        <PrintDocumentHeader
          courseTitle={playerState.courseTitle}
          label={t("courseDetails.lessonLabel")}
          show={printOptions.showHeader}
          sectionTitle={playerState.sectionTitle}
          title={activeLesson.title}
        />
        <div className="print:hidden">
          <PageHeader
            title={
              <CardTitle size="lg">{playerState.courseTitle}</CardTitle>
            }
            subtitle={
              <CardDescription className="text-base">
                {playerState.sectionTitle}
                {" · "}
                {t("courseDetails.progress", {
                  current: playerState.progressCurrent,
                  total: playerState.progressTotal,
                })}
              </CardDescription>
            }
            right={
              <CoursePlayerActions
                isRefreshingAvailable={false}
                onClose={playerState.exitPlayer}
                onRefreshExercise={() => {}}
                printControl={
                  <PrintOptionsMenu
                    mode="lesson"
                    onPrint={() => window.print()}
                    onPrintOptionsChange={setPrintOptions}
                    printOptions={printOptions}
                  >
                    <Button
                      aria-label={t("courseDetails.printCourse")}
                      shape="circle"
                      size="icon"
                      variant="secondary"
                    >
                      <Printer aria-hidden="true" className="h-5 w-5" />
                    </Button>
                  </PrintOptionsMenu>
                }
              />
            }
          />
        </div>
        <CourseLessonContent
          activeLesson={activeLesson}
          courseId={courseId}
          onContinueFromLesson={(lesson) => {
            if (!lesson.test || lesson.test.exercises.length === 0) {
              playerState.moveToNextStep();
              return;
            }

            navigate(buildLessonTestPath(courseId, lesson.id));
          }}
        />
      </>
    </CoursePlayerShell>
  );
}
