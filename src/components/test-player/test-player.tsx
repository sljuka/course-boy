import { Play, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { CourseTestContent } from "@/components/course-player/course-test-content";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { useCoursePlayer } from "@/components/course-player/use-course-player";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardDescription, LessonTitle } from "@/components/ui/card";
import { AlertInteractiveMode } from "@/components/test-player/alert-interactive-mode";
import { TestPlayerPrintHint } from "@/components/test-player/test-player-print-hint";
import { useTestPlayerState } from "@/components/test-player/use-test-player-state";
import { defaultTestPrintOptions } from "@/lib/print-options";
import { buildLessonPath } from "@/lib/course-utils";

export function TestPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const playerState = useCoursePlayer({ courseId, lessonId });
  const { t } = useTranslation();
  const [printOptions, setPrintOptions] = useState(defaultTestPrintOptions);
  const readyPlayerState = playerState.status === "ready" ? playerState : null;
  const {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    isInteractiveHintVisible,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    setIsInteractiveHintVisible,
    setIsPrintHintVisible,
    submitExercise,
    testFeedback,
    updateExerciseAnswer,
  } = useTestPlayerState(readyPlayerState?.activeLesson);

  if (!readyPlayerState) {
    return <CoursePlayerShell playerState={playerState} />;
  }

  if (
    !readyPlayerState.activeLesson.test ||
    readyPlayerState.activeLesson.test.exercises.length === 0
  ) {
    return (
      <Navigate
        replace
        to={buildLessonPath(courseId, readyPlayerState.activeLesson.id)}
      />
    );
  }

  return (
    <CoursePlayerShell playerState={readyPlayerState}>
      <>
        <PrintDocumentHeader
          courseTitle={readyPlayerState.courseTitle}
          label={t("courseDetails.testLabel")}
          show={printOptions.showHeader}
          sectionTitle={readyPlayerState.sectionTitle}
          title={readyPlayerState.activeLesson.title}
        />
        <PageHeader
          title={<LessonTitle>{readyPlayerState.courseTitle}</LessonTitle>}
          className="print:hidden"
          subtitle={
            <CardDescription className="text-base text-stone-600">
              {readyPlayerState.sectionTitle}
              {" · "}
              {t("courseDetails.progress", {
                current: readyPlayerState.progressCurrent,
                total: readyPlayerState.progressTotal,
              })}
            </CardDescription>
          }
          right={
            <CoursePlayerActions
              courseId={courseId}
              isRefreshingAvailable={activeTestExercises.length > 0}
              onRefreshExercise={refreshExercises}
              printControl={
                <div className="flex items-center gap-2">
                  <PrintOptionsMenu
                    mode="test"
                    onPrint={() => window.print()}
                    onPrintOptionsChange={setPrintOptions}
                    printOptions={printOptions}
                  >
                    <Button
                      aria-label={t("courseDetails.printCourse")}
                      className="rounded-full"
                      size="icon"
                      variant="secondary"
                    >
                      <Printer aria-hidden="true" className="h-5 w-5" />
                    </Button>
                  </PrintOptionsMenu>
                  <Button
                    aria-label={t("courseDetails.interactiveHintTitle")}
                    className="rounded-full"
                    size="icon"
                    variant="secondary"
                  >
                    <Play
                      aria-hidden="true"
                      className="h-5 w-5 fill-emerald-600 text-emerald-600"
                    />
                  </Button>
                </div>
              }
            />
          }
        />
        <div>
          {isPrintHintVisible && (
            <TestPlayerPrintHint
              onDismiss={() => setIsPrintHintVisible(false)}
              onPrintOptionsChange={setPrintOptions}
              printOptions={printOptions}
            />
          )}
          {isInteractiveHintVisible && (
            <AlertInteractiveMode
              onDismiss={() => setIsInteractiveHintVisible(false)}
            />
          )}
          <CourseTestContent
            activeTestExercises={activeTestExercises}
            activeTestInstances={activeTestInstances}
            exerciseAnswers={exerciseAnswers}
            exerciseResults={exerciseResults}
            isTestPassed={isTestPassed}
            onContinueAfterExercise={readyPlayerState.moveToNextLesson}
            onSubmitExercise={submitExercise}
            onUpdateExerciseAnswer={updateExerciseAnswer}
            printAnswerStyle={printOptions.answerStyle}
            printExerciseHintStyle={printOptions.exerciseHintStyle}
            showPrintTestSeparators={printOptions.showTestSeparators}
            testFeedback={testFeedback}
          />
        </div>
      </>
    </CoursePlayerShell>
  );
}
