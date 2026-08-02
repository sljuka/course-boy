import { Play, Printer } from "lucide-react";
import { useEffect, useState } from "react";
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
import type { CourseExercise } from "@/lib/course-package";
import { defaultTestPrintOptions } from "@/lib/print-options";
import {
  buildExerciseInstance,
  buildTestExerciseSequence,
  roundToPrecision,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import { buildLessonPath } from "@/lib/course-utils";

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

export function TestPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const playerState = useCoursePlayer({ courseId, lessonId });
  const { t } = useTranslation();
  const [activeTestExercises, setActiveTestExercises] = useState<
    CourseExercise[]
  >([]);
  const [activeTestInstances, setActiveTestInstances] = useState<
    ExerciseInstance[]
  >([]);
  const [exerciseAnswers, setExerciseAnswers] = useState<string[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [isTestPassed, setIsTestPassed] = useState(false);
  const [isPrintHintVisible, setIsPrintHintVisible] = useState(true);
  const [isInteractiveHintVisible, setIsInteractiveHintVisible] =
    useState(true);
  const [printOptions, setPrintOptions] = useState(defaultTestPrintOptions);
  const readyPlayerState = playerState.status === "ready" ? playerState : null;
  const printMenuLabels = {
    answerStyle: {
      box: t("courseDetails.printAnswerStyleBox"),
      empty: t("courseDetails.printAnswerStyleEmpty"),
      label: t("courseDetails.printAnswerStyle"),
      lines: t("courseDetails.printAnswerStyleLines"),
      squares: t("courseDetails.printAnswerStyleSquares"),
    },
    exerciseHints: {
      hidden: t("courseDetails.printExerciseHintsHide"),
      label: t("courseDetails.printExerciseHints"),
      upsideDown: t("courseDetails.printExerciseHintsUpsideDown"),
      visible: t("courseDetails.printExerciseHintsPrint"),
    },
    header: t("courseDetails.printOptionHeader"),
    printNow: t("courseDetails.printNow"),
    testSeparators: t("courseDetails.printOptionSeparators"),
    title: t("courseDetails.printOptions"),
  };

  function resetExerciseState() {
    setActiveTestExercises([]);
    setActiveTestInstances([]);
    setExerciseAnswers([]);
    setExerciseResults([]);
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  useEffect(() => {
    resetExerciseState();
    setIsPrintHintVisible(true);
    setIsInteractiveHintVisible(true);

    if (
      !readyPlayerState?.activeLesson.test ||
      readyPlayerState.activeLesson.test.exercises.length === 0
    ) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(
      readyPlayerState.activeLesson,
    );

    if (selectedExercises.length === 0) {
      return;
    }

    setActiveTestExercises(selectedExercises);
    setActiveTestInstances(
      selectedExercises.map((exercise) => buildExerciseInstance(exercise)),
    );
    setExerciseAnswers(selectedExercises.map(() => ""));
    setExerciseResults(
      selectedExercises.map(() => ({
        feedback: null,
        isCorrect: false,
      })),
    );
  }, [readyPlayerState?.activeLesson]);

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

  function updateExerciseAnswer(index: number, value: string) {
    setExerciseAnswers((currentAnswers) =>
      currentAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer,
      ),
    );
    setExerciseResults((currentResults) =>
      currentResults.map((result, resultIndex) =>
        resultIndex === index ? { feedback: null, isCorrect: false } : result,
      ),
    );
    setTestFeedback(null);
    setIsTestPassed(false);
  }

  function submitExercise() {
    if (activeTestExercises.length === 0 || activeTestInstances.length === 0) {
      return;
    }

    let allCorrect = true;
    const nextResults = activeTestExercises.map((exercise, index) => {
      const normalizedAnswer = (exerciseAnswers[index] ?? "").trim();

      if (!normalizedAnswer) {
        allCorrect = false;
        return {
          feedback: t("courseDetails.enterAnswer"),
          isCorrect: false,
        };
      }

      const parsedAnswer = Number(normalizedAnswer.replace(",", "."));

      if (Number.isNaN(parsedAnswer)) {
        allCorrect = false;
        return {
          feedback: t("courseDetails.enterAnswer"),
          isCorrect: false,
        };
      }

      const roundedAnswer = roundToPrecision(parsedAnswer, exercise.precision);

      if (roundedAnswer === activeTestInstances[index]?.expectedAnswer) {
        return {
          feedback: null,
          isCorrect: true,
        };
      }

      allCorrect = false;
      return {
        feedback: exercise.hint
          ? t("courseDetails.incorrectAnswerWithHint", {
              hint: exercise.hint,
            })
          : t("courseDetails.incorrectAnswer"),
        isCorrect: false,
      };
    });

    setExerciseResults(nextResults);
    setIsTestPassed(allCorrect);
    setTestFeedback(
      allCorrect
        ? t("courseDetails.correctAnswer")
        : t("courseDetails.incorrectAnswer"),
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
      <div className="print:hidden">
        <PageHeader
          title={<LessonTitle>{readyPlayerState.courseTitle}</LessonTitle>}
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
              onRefreshExercise={() => {
                if (activeTestExercises.length === 0) {
                  return;
                }

                setActiveTestInstances(
                  activeTestExercises.map((exercise) =>
                    buildExerciseInstance(exercise),
                  ),
                );
                setExerciseAnswers(activeTestExercises.map(() => ""));
                setExerciseResults(
                  activeTestExercises.map(() => ({
                    feedback: null,
                    isCorrect: false,
                  })),
                );
                setTestFeedback(null);
                setIsTestPassed(false);
              }}
              printControl={
                <div className="flex items-center gap-2">
                  <PrintOptionsMenu
                    labels={printMenuLabels}
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
      </div>
      <div>
        {isPrintHintVisible && (
          <TestPlayerPrintHint
            labels={printMenuLabels}
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
