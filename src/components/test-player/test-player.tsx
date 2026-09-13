import { Play, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { CourseTestContent } from "@/components/course-player/course-test-content";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { useCoursePlayer, type CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
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

  if (playerState.status !== "ready") {
    return <CoursePlayerShell playerState={playerState} />;
  }

  return <TestPlayerView playerState={playerState} />;
}

/**
 * The full test-taking experience, split out from `TestPlayer` so the draft
 * editor's "Preview test" can render the *exact* same UI a student sees by
 * supplying its own in-memory `CoursePlayerReadyState` instead of one loaded
 * from disk via `useCoursePlayer` — see "Previewing a draft test" in
 * docs/persistence-notes.md.
 */
export function TestPlayerView({
  playerState,
}: {
  playerState: CoursePlayerReadyState;
}) {
  const { t } = useTranslation();
  const [printOptions, setPrintOptions] = useState(defaultTestPrintOptions);
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
  } = useTestPlayerState(playerState.activeLesson);

  if (!playerState.activeLesson.test || playerState.activeLesson.test.exercises.length === 0) {
    return (
      <Navigate
        replace
        to={buildLessonPath(playerState.courseId, playerState.activeLesson.id)}
      />
    );
  }

  return (
    <>
      <PrintDocumentHeader
        courseTitle={playerState.courseTitle}
        label={t("courseDetails.testLabel")}
        show={printOptions.showHeader}
        sectionTitle={playerState.sectionTitle}
        title={playerState.activeLesson.title}
      />
      <PageHeader
        title={
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
            {playerState.courseTitle}
          </CardTitle>
        }
        className="print:hidden"
        subtitle={
          <CardDescription className="text-base text-stone-600">
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
            isRefreshingAvailable={activeTestExercises.length > 0}
            onClose={playerState.exitPlayer}
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
          onContinueAfterExercise={playerState.moveToNextLesson}
          onSubmitExercise={submitExercise}
          onUpdateExerciseAnswer={updateExerciseAnswer}
          printAnswerStyle={printOptions.answerStyle}
          printExerciseHintStyle={printOptions.exerciseHintStyle}
          showPrintTestSeparators={printOptions.showTestSeparators}
          testFeedback={testFeedback}
        />
      </div>
    </>
  );
}
