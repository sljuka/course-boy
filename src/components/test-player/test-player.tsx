import { FileText, Play, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { MnemonicsToggle } from "@/components/course-player/mnemonics-toggle";
import { PlayerIconButton } from "@/components/course-player/player-icon-button";
import { PrintFillInFields } from "@/components/course-player/print-fill-in-fields";
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
import { GradedTestSummary } from "@/components/test-player/graded-test-summary";
import { PracticeTestResult, type PracticeTestResultValue } from "@/components/test-player/practice-test-result";
import { TestStartScreen } from "@/components/test-player/test-start-screen";
import { InteractiveTestPlayer } from "@/components/test-player/interactive-test-player";
import { TestPlayerPrintHint } from "@/components/test-player/test-player-print-hint";
import { type ExerciseResult, useTestPlayerState } from "@/components/test-player/use-test-player-state";
import type { CourseMnemonic } from "@/lib/mnemonics";
import { defaultTestPrintOptions } from "@/lib/print-options";
import { PromptMnemonicsContext } from "@/lib/prompt-mnemonics-context";
import { useCourseMnemonics } from "@/lib/use-course-mnemonics";
import { usePrintDensity } from "@/lib/use-print-density";
import { buildLessonPath } from "@/lib/course-utils";
import { recordTestResult, useCourseProgressQuery, useCourseSpree } from "@/lib/course-progress-queries";
import { isBetterAttempt, scoreGradedAttempt, scoreTestAttempt } from "@/lib/course-progress";
import { exercisePoints, resolveGradeBands } from "@/lib/grade-bands";
import { pickCheerKey } from "@/lib/practice-cheers";
import { buildCourseExercisePool } from "@/lib/course-exercise-pool";
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
  usePrintDensity(printOptions.density);
  // Lifted up from `InteractiveTestPlayer` so the stepper can be rendered in
  // this component's own header row (same height as the close button)
  // instead of inside the player's centered content.
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  // The furthest question reached in this attempt: the stepper can jump back
  // to it after going to an earlier one.
  const [reachedExerciseIndex, setReachedExerciseIndex] = useState(0);
  if (currentExerciseIndex > reachedExerciseIndex) {
    setReachedExerciseIndex(currentExerciseIndex);
  }
  // Interactive mode's Print button lands in paper mode with this open.
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const activeItem = playerState.activeStep.item;
  const { shown: shownMnemonics } = useCourseMnemonics(playerState.courseId);
  const spree = useCourseSpree({ courseId: playerState.courseId, isPreview: playerState.isPreview });
  const progressQuery = useCourseProgressQuery();
  // A graded test (SLJ-135): no feedback while it's taken, a score at the end.
  const isGraded = activeItem.test?.graded === true;
  const gradeBands = resolveGradeBands(activeItem.test?.gradeBands, playerState.courseGradeBands);
  const [gradedResult, setGradedResult] = useState<{
    isNewBest: boolean;
    maxPoints: number;
    points: number;
    // Each question's result, for the summary (SLJ-140).
    results: ExerciseResult[];
  } | null>(null);
  const [isShowingSummary, setIsShowingSummary] = useState(false);
  // The end of a practice test: its results card.
  const [practiceResult, setPracticeResult] = useState<PracticeTestResultValue | null>(null);
  // The course spree's best when this attempt started, to tell a new best at
  // its end (set once the student's progress has loaded).
  const [spreeBestAtStart, setSpreeBestAtStart] = useState<number | null>(null);
  if (spreeBestAtStart === null && (progressQuery.data || playerState.isPreview)) {
    setSpreeBestAtStart(spree.best);
  }
  const isShowingResult = gradedResult !== null || practiceResult !== null;
  // The start screen (SLJ-137): before the first question in interactive
  // mode, a section test's by default, a lesson's only if the teacher wants
  // it. Try again doesn't show it again.
  const [hasStarted, setHasStarted] = useState(false);

  // "Finish test" with questions unanswered: the grading, waiting for the
  // student to confirm.
  const [pendingFinish, setPendingFinish] = useState<ExerciseResult[] | null>(null);
  const [isFinishByEnter, setIsFinishByEnter] = useState(false);
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
    courseTests: playerState.courseTests,
    // A graded test gives no feedback, so it has no spree to grow or end.
    onFirstTry: isGraded ? undefined : spree.recordFirstTry,
    startInteractive,
  });
  // A lesson's test is kept under its own step id, the one course summaries
  // list it by.
  const stepId = playerState.activeStep.kind === "lesson" ? resolveTestIdForLesson(activeItem.id) : activeItem.id;
  const showsStartScreen =
    isInteractiveMode &&
    !hasStarted &&
    !isShowingResult &&
    (activeItem.test?.showStartScreen ?? playerState.activeStep.kind === "test");

  // The end of a practice test: it's done, with this attempt's first-try
  // score (SLJ-50), kept the moment the card shows. A teacher's preview
  // records nothing and has no best to beat.
  function finishPracticeTest() {
    const result = scoreTestAttempt(firstTryCorrect);
    const previous = progressQuery.data?.courses[playerState.courseId]?.steps[stepId]?.test;
    const previousLongest = previous ? Math.max(previous.best.longestStreak, previous.latest.longestStreak) : null;
    if (!playerState.isPreview) {
      recordTestResult({ courseId: playerState.courseId, result, stepId });
    }
    setPracticeResult({
      cheerKey: pickCheerKey(result.total > 0 && result.correct === result.total),
      correct: result.correct,
      isNewBestStreak: !playerState.isPreview && previousLongest !== null && result.longestStreak > previousLongest,
      longestStreak: result.longestStreak,
      // Only once there was a best to beat, like the test's own streak.
      newBestSpree:
        !playerState.isPreview && spreeBestAtStart && spree.best > spreeBestAtStart ? spree.best : null,
      total: result.total,
    });
  }

  function tryPracticeTestAgain() {
    restart();
    setCurrentExerciseIndex(0);
    setReachedExerciseIndex(0);
    setPracticeResult(null);
    setSpreeBestAtStart(spree.best);
  }

  // Asks first when answers are empty, or when asked to (Enter): then Finish
  // has the focus, so a second Enter confirms.
  function finishGradedTest({ confirm }: { confirm: boolean }) {
    const results = gradeAll();
    if (confirm || results.some((result) => !result.isAnswered)) {
      setPendingFinish(results);
      setIsFinishByEnter(confirm);
      return;
    }
    completeGradedTest(results);
  }

  // The score is kept the moment the test is finished, so closing the
  // player from the results card doesn't lose it.
  function completeGradedTest(results: ExerciseResult[]) {
    setPendingFinish(null);
    const partialCredit = activeItem.test?.partialCredit === true;
    const result = scoreGradedAttempt(
      results.map((exerciseResult, index) => ({
        isCorrect: exerciseResult.isCorrect,
        points: exercisePoints(activeTestExercises[index] ?? {}),
        ...(partialCredit ? { share: exerciseResult.share } : {}),
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
      results,
    });
  }

  function tryGradedTestAgain() {
    setIsShowingSummary(false);
    restart();
    setCurrentExerciseIndex(0);
    setReachedExerciseIndex(0);
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

  // A final test (SLJ-136) has exercises when anything in its pool does.
  const hasExercises = activeItem.test?.includeCourseExercises
    ? buildCourseExercisePool(activeItem.test, playerState.courseTests).length > 0
    : (activeItem.test?.exercises.length ?? 0) > 0;

  if (!activeItem.test || !hasExercises) {
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
  const toolbarActions = isShowingResult ? (
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
            graded={isGraded}
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
        !isShowingResult && (
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
        isInteractiveMode &&
        !isGraded &&
        !isShowingResult &&
        !showsStartScreen && <CourseSpree best={spree.best} current={spree.current} />
      }
      // Interactive mode steps through one exercise at a time; its stepper
      // sits centred in the action bar.
      actionBarCenter={
        isInteractiveMode &&
        !isShowingResult &&
        !showsStartScreen && (
          <ExerciseStepper
            answered={isGraded ? gradeAll().map((result) => result.isAnswered) : undefined}
            currentIndex={currentExerciseIndex}
            onSelectStep={setCurrentExerciseIndex}
            reachedIndex={reachedExerciseIndex}
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
      <PrintFillInFields showDate={printOptions.showDateField} showName={printOptions.showNameField} />
      <PromptMnemonicsContext.Provider value={allowsMnemonics ? shownMnemonics : NO_MNEMONICS}>
        {gradedResult && isShowingSummary ? (
          <GradedTestSummary
            answers={exerciseAnswers}
            exercises={activeTestExercises}
            instances={activeTestInstances}
            onBack={() => setIsShowingSummary(false)}
            onContinue={playerState.moveToNextStep}
            partialCredit={activeItem.test?.partialCredit === true}
            results={gradedResult.results}
          />
        ) : gradedResult ? (
          <GradedTestResult
            bands={gradeBands}
            isNewBest={gradedResult.isNewBest}
            maxPoints={gradedResult.maxPoints}
            onContinue={playerState.moveToNextStep}
            onShowSummary={activeItem.test?.showSummary === false ? undefined : () => setIsShowingSummary(true)}
            onTryAgain={tryGradedTestAgain}
            points={gradedResult.points}
            questionCount={activeTestExercises.length}
          />
        ) : practiceResult ? (
          <PracticeTestResult
            bands={gradeBands}
            isPreview={playerState.isPreview}
            onContinue={playerState.moveToNextStep}
            onTryAgain={tryPracticeTestAgain}
            result={practiceResult}
          />
        ) : showsStartScreen ? (
          <TestStartScreen
            description={activeItem.description}
            graded={isGraded}
            maxPoints={activeTestExercises.reduce((sum, exercise) => sum + exercisePoints(exercise), 0)}
            onStart={() => setHasStarted(true)}
            partialCredit={activeItem.test?.partialCredit === true}
            questionCount={activeTestExercises.length}
            title={activeItem.title}
          />
        ) : isInteractiveMode ? (
          <InteractiveTestPlayer
            activeTestExercises={activeTestExercises}
            activeTestInstances={activeTestInstances}
            currentIndex={currentExerciseIndex}
            exerciseAnswers={exerciseAnswers}
            exerciseResults={exerciseResults}
            graded={isGraded}
            onContinueAfterExercise={finishPracticeTest}
            onFinishGradedTest={finishGradedTest}
            onIndexChange={setCurrentExerciseIndex}
            onSubmitExercise={submitSingleExercise}
            onUpdateExerciseAnswer={updateExerciseAnswer}
          />
        ) : (
          <>
            {isPrintHintVisible && (
              <TestPlayerPrintHint
                graded={isGraded}
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
              onContinueAfterExercise={finishPracticeTest}
              onFinishGradedTest={finishGradedTest}
              onSubmitExercise={submitExercise}
              onUpdateExerciseAnswer={updateExerciseAnswer}
              printAnswerStyle={printOptions.answerStyle}
              printPoints={isGraded && printOptions.showPoints}
              printExerciseHintStyle={printOptions.exerciseHintStyle}
              showPrintDecorativeMedia={printOptions.showDecorativeMedia}
              showPrintTestSeparators={printOptions.showTestSeparators}
              testFeedback={testFeedback}
            />
          </>
        )}
      </PromptMnemonicsContext.Provider>
      <FinishGradedTestDialog
        focusFinish={isFinishByEnter}
        onConfirm={() => pendingFinish && completeGradedTest(pendingFinish)}
        onOpenChange={(open) => !open && setPendingFinish(null)}
        open={pendingFinish !== null}
        unansweredCount={pendingFinish?.filter((result) => !result.isAnswered).length ?? 0}
      />
    </Page>
  );
}
