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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { AlertInteractiveMode } from "@/components/test-player/alert-interactive-mode";
import { ExerciseStepper } from "@/components/test-player/exercise-stepper";
import { InteractiveTestPlayer } from "@/components/test-player/interactive-test-player";
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
  // Lifted up from `InteractiveTestPlayer` so the stepper can be rendered in
  // this component's own header row (same height as the close button)
  // instead of inside the player's centered content.
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const activeItem = playerState.activeStep.item;
  const {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    isInteractiveHintVisible,
    isInteractiveMode,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    setIsInteractiveHintVisible,
    setIsInteractiveMode,
    setIsPrintHintVisible,
    submitExercise,
    submitSingleExercise,
    testFeedback,
    updateExerciseAnswer,
  } = useTestPlayerState(activeItem);

  function startInteractiveMode() {
    setCurrentExerciseIndex(0);
    setIsInteractiveMode(true);
  }

  if (!activeItem.test || activeItem.test.exercises.length === 0) {
    // A lesson-attached test with nothing to show falls back to its own
    // document; a standalone test has no document to fall back to, so it
    // exits back to the course details page instead.
    return (
      <Navigate
        replace
        to={
          playerState.activeStep.kind === "lesson"
            ? buildLessonPath(playerState.courseId, activeItem.id)
            : `/courses/${playerState.courseId}`
        }
      />
    );
  }

  return (
    <>
      <PrintDocumentHeader
        courseTitle={playerState.courseTitle}
        description={activeItem.description}
        label={t("courseDetails.testLabel")}
        show={printOptions.showHeader}
        sectionTitle={playerState.sectionTitle}
        title={activeItem.title}
      />
      {isInteractiveMode ? (
        // A dedicated header instead of `PageHeader`: the stepper needs to
        // sit at the same height as the close button, centered across the
        // full row, which `PageHeader`'s title/subtitle-vs-right split
        // (plus `right`'s own `hidden lg:flex`) isn't set up for.
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex-1" />
          <ExerciseStepper
            currentIndex={currentExerciseIndex}
            onSelectStep={setCurrentExerciseIndex}
            total={activeTestExercises.length}
          />
          <div className="flex flex-1 justify-end">
            <CoursePlayerActions
              isRefreshingAvailable={false}
              onClose={() => setIsInteractiveMode(false)}
              onRefreshExercise={refreshExercises}
              printControl={null}
            />
          </div>
        </div>
      ) : (
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <CardTitle size="lg">{playerState.courseTitle}</CardTitle>
              {playerState.isPreview && (
                <Badge variant="secondary">{t("courseDetails.previewBadge")}</Badge>
              )}
            </div>
          }
          className="print:hidden"
          subtitle={
            <div className="flex flex-col gap-1">
              {activeItem.description && (
                <CardDescription className="text-base">
                  {activeItem.description}
                </CardDescription>
              )}
              {/* The section/progress line is synthetic in preview (a single
                  fake "Preview" section, always "1 of 1") — skip it there. */}
              {!playerState.isPreview && (
                <CardDescription className="text-base">
                  {playerState.sectionTitle}
                  {" · "}
                  {t("courseDetails.progress", {
                    current: playerState.progressCurrent,
                    total: playerState.progressTotal,
                  })}
                </CardDescription>
              )}
            </div>
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
                      shape="circle"
                      size="icon"
                      variant="secondary"
                    >
                      <Printer aria-hidden="true" className="h-5 w-5" />
                    </Button>
                  </PrintOptionsMenu>
                  <Button
                    aria-label={t("courseDetails.interactiveHintTitle")}
                    onClick={startInteractiveMode}
                    shape="circle"
                    size="icon"
                    variant="secondary"
                  >
                    <Play aria-hidden="true" className="h-5 w-5 fill-success text-success" />
                  </Button>
                </div>
              }
            />
          }
        />
      )}
      <div>
        {isInteractiveMode ? (
          <InteractiveTestPlayer
            activeTestExercises={activeTestExercises}
            activeTestInstances={activeTestInstances}
            currentIndex={currentExerciseIndex}
            exerciseAnswers={exerciseAnswers}
            exerciseResults={exerciseResults}
            onContinueAfterExercise={playerState.moveToNextStep}
            onIndexChange={setCurrentExerciseIndex}
            onSubmitExercise={submitSingleExercise}
            onUpdateExerciseAnswer={updateExerciseAnswer}
            strictAdvancement={activeItem.test?.strictAdvancement ?? true}
          />
        ) : (
          <>
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
                onStart={startInteractiveMode}
              />
            )}
            <CourseTestContent
              activeTestExercises={activeTestExercises}
              activeTestInstances={activeTestInstances}
              exerciseAnswers={exerciseAnswers}
              exerciseResults={exerciseResults}
              isTestPassed={isTestPassed}
              onContinueAfterExercise={playerState.moveToNextStep}
              onSubmitExercise={submitExercise}
              onUpdateExerciseAnswer={updateExerciseAnswer}
              printAnswerStyle={printOptions.answerStyle}
              printExerciseHintStyle={printOptions.exerciseHintStyle}
              showPrintTestSeparators={printOptions.showTestSeparators}
              testFeedback={testFeedback}
            />
          </>
        )}
      </div>
    </>
  );
}
