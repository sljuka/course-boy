import { FileText, Play, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { MnemonicsToggle } from "@/components/course-player/mnemonics-toggle";
import { PlayerIconButton } from "@/components/course-player/player-icon-button";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { CourseSpree } from "@/components/course-player/course-spree";
import { CourseTestContent } from "@/components/course-player/course-test-content";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { useCoursePlayer, type CoursePlayerReadyState } from "@/components/course-player/use-course-player";
import { Page } from "@/components/page/page";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { ExerciseStepper } from "@/components/test-player/exercise-stepper";
import { FinishGradedTestDialog } from "@/components/test-player/finish-graded-test-dialog";
import { GradedTestResult } from "@/components/test-player/graded-test-result";
import { InteractiveTestPlayer } from "@/components/test-player/interactive-test-player";
import { TestPlayerPrintHint } from "@/components/test-player/test-player-print-hint";
import { type ExerciseResult, useTestPlayerState } from "@/components/test-player/use-test-player-state";
import type { CourseMnemonic } from "@/lib/mnemonics";
import { defaultTestPrintOptions } from "@/lib/print-options";
import { PromptMnemonicsContext } from "@/lib/prompt-mnemonics-context";
import { useCourseMnemonics } from "@/lib/use-course-mnemonics";
import { buildLessonPath } from "@/lib/course-utils";
import { recordTestResult, useCourseProgressQuery, useCourseSpree } from "@/lib/course-progress-queries";
import { isBetterAttempt, scoreGradedAttempt, scoreTestAttempt } from "@/lib/course-progress";
import { exercisePoints, resolveGradeBands } from "@/lib/grade-bands";
import { useStartTestsInteractivePreference } from "@/lib/start-tests-interactive-preference";
import { resolveTestIdForLesson } from "@/lib/course-test-id";

const NO_MNEMONICS: CourseMnemonic[] = [];

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
  // Waits for the setting, so a test doesn't open in one mode and jump to
  // the other. Keyed by the test, so the next test starts afresh (its first
  // exercise, its mode, the print menu closed).
  const { isLoading, startInteractive } = useStartTestsInteractivePreference();

  if (isLoading) {
    return null;
  }

  return (
    <TestPlayerContent
      key={playerState.activeStep.item.id}
      playerState={playerState}
      startInteractive={startInteractive}
    />
  );
}

function TestPlayerContent({
  playerState,
  startInteractive,
}: {
  playerState: CoursePlayerReadyState;
  startInteractive: boolean;
}) {
  const { t } = useTranslation();
  const [printOptions, setPrintOptions] = useState(defaultTestPrintOptions);
  // Lifted up from `InteractiveTestPlayer` so the stepper can be rendered in
  // this component's own header row (same height as the close button)
  // instead of inside the player's centered content.
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  // Interactive mode's Print button lands in paper mode with this open.
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const activeItem = playerState.activeStep.item;
  const { shown: shownMnemonics } = useCourseMnemonics(playerState.courseId);
  const spree = useCourseSpree({ courseId: playerState.courseId, isPreview: playerState.isPreview });
  const progressQuery = useCourseProgressQuery();
  // A graded test (SLJ-135): no feedback while it's taken, a score at the end.
  const isGraded = activeItem.test?.graded === true;
  const gradeBands = resolveGradeBands(activeItem.test?.gradeBands, playerState.courseGradeBands);
  const [gradedResult, setGradedResult] = useState<{ isNewBest: boolean; maxPoints: number; points: number } | null>(
    null,
  );
  // "Finish test" with questions unanswered: the grading, waiting for the
  // student to confirm.
  const [pendingFinish, setPendingFinish] = useState<ExerciseResult[] | null>(null);
  const {
    activeTestExercises,
    activeTestInstances,
    exerciseAnswers,
    exerciseResults,
    firstTryCorrect,
    gradeAll,
    isInteractiveMode,
    isPrintHintVisible,
    isTestPassed,
    refreshExercises,
    restart,
    setIsInteractiveMode,
    setIsPrintHintVisible,
    submitExercise,
    submitSingleExercise,
    testFeedback,
    updateExerciseAnswer,
  } = useTestPlayerState(activeItem, {
    // A graded test gives no feedback, so it has no spree to grow or end.
    onFirstTry: isGraded ? undefined : spree.recordFirstTry,
    startInteractive,
  });
  // A lesson's test is kept under its own step id, the one course summaries
  // list it by.
  const stepId = playerState.activeStep.kind === "lesson" ? resolveTestIdForLesson(activeItem.id) : activeItem.id;

  // Continue after a practice test: it's done, with this attempt's first-try
  // score (SLJ-50). A teacher's preview records nothing.
  function continueAfterTest() {
    if (!playerState.isPreview) {
      recordTestResult({ courseId: playerState.courseId, result: scoreTestAttempt(firstTryCorrect), stepId });
    }
    playerState.moveToNextStep();
  }

  function finishGradedTest() {
    const results = gradeAll();
    if (results.some((result) => !result.isAnswered)) {
      setPendingFinish(results);
      return;
    }
    completeGradedTest(results);
  }

  // The score is kept the moment the test is finished, so closing the
  // player from the results card doesn't lose it.
  function completeGradedTest(results: ExerciseResult[]) {
    setPendingFinish(null);
    const result = scoreGradedAttempt(
      results.map((exerciseResult, index) => ({
        isCorrect: exerciseResult.isCorrect,
        points: exercisePoints(activeTestExercises[index] ?? {}),
      })),
    );
    const previousBest = progressQuery.data?.courses[playerState.courseId]?.steps[stepId]?.test?.best;
    if (!playerState.isPreview) {
      recordTestResult({ courseId: playerState.courseId, result, stepId });
    }
    setGradedResult({
      isNewBest: Boolean(previousBest && isBetterAttempt(result, previousBest)),
      maxPoints: result.maxPoints ?? 0,
      points: result.points ?? 0,
    });
  }

  function tryGradedTestAgain() {
    restart();
    setCurrentExerciseIndex(0);
    setGradedResult(null);
  }

  function startInteractiveMode() {
    setCurrentExerciseIndex(0);
    setIsInteractiveMode(true);
  }

  // Printing happens in paper mode: the interactive view isn't printed.
  function printFromInteractiveMode() {
    setIsInteractiveMode(false);
    setIsPrintMenuOpen(true);
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

  // The course's mnemonics in this test's prompts, if the teacher allowed
  // them (SLJ-37); never otherwise.
  const allowsMnemonics = activeItem.test?.showMnemonics === true;
  const mnemonicsToggle = allowsMnemonics ? <MnemonicsToggle courseId={playerState.courseId} /> : null;

  // X leaves the test in both modes; interactive mode reaches paper mode
  // through its own two buttons. A graded test's results card has only X.
  const toolbarActions = gradedResult ? (
    <CoursePlayerActions
      isRefreshingAvailable={false}
      onClose={playerState.exitPlayer}
      onRefreshExercise={refreshExercises}
      printControl={null}
    />
  ) : isInteractiveMode ? (
    <CoursePlayerActions
      isRefreshingAvailable={false}
      mnemonicsToggle={mnemonicsToggle}
      onClose={playerState.exitPlayer}
      onRefreshExercise={refreshExercises}
      printControl={
        <div className="flex items-center gap-2">
          <PlayerIconButton
            label={t("courseDetails.printTest")}
            onClick={printFromInteractiveMode}
            testId="test-print"
          >
            <Printer aria-hidden="true" />
          </PlayerIconButton>
          <PlayerIconButton
            label={t("courseDetails.paperMode")}
            onClick={() => setIsInteractiveMode(false)}
            testId="test-paper-mode"
          >
            <FileText aria-hidden="true" />
          </PlayerIconButton>
        </div>
      }
    />
  ) : (
    <CoursePlayerActions
      isRefreshingAvailable={activeTestExercises.length > 0}
      mnemonicsToggle={mnemonicsToggle}
      onClose={playerState.exitPlayer}
      onRefreshExercise={refreshExercises}
      printControl={
        <div className="flex items-center gap-2">
          <PrintOptionsMenu
            mode="test"
            onOpenChange={setIsPrintMenuOpen}
            onPrint={() => window.print()}
            onPrintOptionsChange={setPrintOptions}
            open={isPrintMenuOpen}
            printOptions={printOptions}
          >
            <Button
              aria-label={t("courseDetails.printCourse")}
              shape="circle"
              size="icon-sm"
              variant="subtle"
            >
              <Printer aria-hidden="true" />
            </Button>
          </PrintOptionsMenu>
          <Button
            aria-label={t("courseDetails.interactiveMode")}
            data-testid="test-interactive-mode"
            onClick={startInteractiveMode}
            shape="circle"
            size="icon-sm"
            variant="subtle"
          >
            <Play aria-hidden="true" className="fill-success text-success" />
          </Button>
        </div>
      }
    />
  );

  return (
    <Page
      // No breadcrumbs in the test player (either mode): only the action bar,
      // with the test's own controls — and, in interactive mode, the stepper.
      header={
        !isInteractiveMode &&
        !gradedResult && (
          <PageHeader
            className="print:hidden"
            title={
              <div className="flex items-center gap-2">
                <CardTitle size="lg">{playerState.courseTitle}</CardTitle>
                {playerState.isPreview && (
                  <Badge variant="secondary">{t("courseDetails.previewBadge")}</Badge>
                )}
              </div>
            }
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
          />
        )
      }
      actions={toolbarActions}
      keepsActionBarInFullScreen
      // Interactive mode centres its one exercise in the page body's height.
      className={isInteractiveMode ? "min-h-full" : undefined}
      // Interactive mode: the course's spree in the corner (SLJ-134).
      actionBarStart={
        isInteractiveMode && !isGraded && !gradedResult && <CourseSpree best={spree.best} current={spree.current} />
      }
      // Interactive mode steps through one exercise at a time; its stepper
      // sits centred in the action bar.
      actionBarCenter={
        isInteractiveMode &&
        !gradedResult && (
          <ExerciseStepper
            currentIndex={currentExerciseIndex}
            onSelectStep={setCurrentExerciseIndex}
            total={activeTestExercises.length}
          />
        )
      }
    >
      <PrintDocumentHeader
        courseTitle={playerState.courseTitle}
        description={activeItem.description}
        label={t("courseDetails.testLabel")}
        show={printOptions.showHeader}
        sectionTitle={playerState.sectionTitle}
        title={activeItem.title}
      />
      <PromptMnemonicsContext.Provider value={allowsMnemonics ? shownMnemonics : NO_MNEMONICS}>
        {gradedResult ? (
          <GradedTestResult
            bands={gradeBands}
            isNewBest={gradedResult.isNewBest}
            maxPoints={gradedResult.maxPoints}
            onContinue={playerState.moveToNextStep}
            onTryAgain={tryGradedTestAgain}
            points={gradedResult.points}
          />
        ) : isInteractiveMode ? (
          <InteractiveTestPlayer
            activeTestExercises={activeTestExercises}
            activeTestInstances={activeTestInstances}
            currentIndex={currentExerciseIndex}
            exerciseAnswers={exerciseAnswers}
            exerciseResults={exerciseResults}
            graded={isGraded}
            onContinueAfterExercise={continueAfterTest}
            onFinishGradedTest={finishGradedTest}
            onIndexChange={setCurrentExerciseIndex}
            onSubmitExercise={submitSingleExercise}
            onUpdateExerciseAnswer={updateExerciseAnswer}
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
            <CourseTestContent
              activeTestExercises={activeTestExercises}
              activeTestInstances={activeTestInstances}
              exerciseAnswers={exerciseAnswers}
              exerciseResults={exerciseResults}
              graded={isGraded}
              isTestPassed={isTestPassed}
              onContinueAfterExercise={continueAfterTest}
              onFinishGradedTest={finishGradedTest}
              onSubmitExercise={submitExercise}
              onUpdateExerciseAnswer={updateExerciseAnswer}
              printAnswerStyle={printOptions.answerStyle}
              printExerciseHintStyle={printOptions.exerciseHintStyle}
              showPrintDecorativeMedia={printOptions.showDecorativeMedia}
              showPrintTestSeparators={printOptions.showTestSeparators}
              testFeedback={testFeedback}
            />
          </>
        )}
      </PromptMnemonicsContext.Provider>
      <FinishGradedTestDialog
        onConfirm={() => pendingFinish && completeGradedTest(pendingFinish)}
        onOpenChange={(open) => !open && setPendingFinish(null)}
        open={pendingFinish !== null}
        unansweredCount={pendingFinish?.filter((result) => !result.isAnswered).length ?? 0}
      />
    </Page>
  );
}
