import { Info, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { CourseTestContent } from "@/components/course-player/course-test-content";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription, LessonTitle } from "@/components/ui/card";
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
  return (
    <CoursePlayerShell courseId={courseId} lessonId={lessonId}>
      {({
        activeLesson,
        courseTitle,
        moveToNextLesson,
        progressCurrent,
        progressTotal,
        sectionTitle,
      }) => (
        <ResolvedTestPlayer
          activeLesson={activeLesson}
          courseId={courseId}
          courseTitle={courseTitle}
          moveToNextLesson={moveToNextLesson}
          progressCurrent={progressCurrent}
          progressTotal={progressTotal}
          sectionTitle={sectionTitle}
        />
      )}
    </CoursePlayerShell>
  );
}

function ResolvedTestPlayer({
  activeLesson,
  courseId,
  courseTitle,
  moveToNextLesson,
  progressCurrent,
  progressTotal,
  sectionTitle,
}: {
  activeLesson: {
    body: string;
    description: string;
    iconUrl: string | null;
    id: string;
    test: {
      exercises: CourseExercise[];
      id: string;
      structure?: { count: number; tag: string }[];
    } | null;
    title: string;
  };
  courseId: string;
  courseTitle: string;
  moveToNextLesson: () => void;
  progressCurrent: number;
  progressTotal: number;
  sectionTitle: string;
}) {
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
  const [printOptions, setPrintOptions] = useState(defaultTestPrintOptions);

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

    if (!activeLesson.test || activeLesson.test.exercises.length === 0) {
      return;
    }

    const selectedExercises = buildTestExerciseSequence(activeLesson);

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
  }, [activeLesson]);

  if (!activeLesson.test || activeLesson.test.exercises.length === 0) {
    return <Navigate replace to={buildLessonPath(courseId, activeLesson.id)} />;
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
    <>
      <PrintDocumentHeader
        courseTitle={courseTitle}
        label={t("courseDetails.testLabel")}
        show={printOptions.showHeader}
        sectionTitle={sectionTitle}
        title={activeLesson.title}
      />
      <div className="mb-4 print:hidden">
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
                <PrintOptionsMenu
                  onPrint={() => window.print()}
                  onPrintOptionsChange={setPrintOptions}
                  printAnswerStyleBoxLabel={t("courseDetails.printAnswerStyleBox")}
                  printAnswerStyleEmptyLabel={t("courseDetails.printAnswerStyleEmpty")}
                  printAnswerStyleLabel={t("courseDetails.printAnswerStyle")}
                  printAnswerStyleLinesLabel={t("courseDetails.printAnswerStyleLines")}
                  printHeaderLabel={t("courseDetails.printOptionHeader")}
                  printNowLabel={t("courseDetails.printNow")}
                  printOptions={printOptions}
                  printTestSeparatorsLabel={t("courseDetails.printOptionSeparators")}
                  showAnswerStyleOptions
                  showTestSeparatorsOption
                  title={t("courseDetails.printOptions")}
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
              }
            />
          }
        />
      </div>
      <div>
        {isPrintHintVisible && (
          <Alert className="mb-4 print:hidden">
            <div className="flex items-start gap-2">
              <Info
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-sky-700"
              />
              <div className="min-w-0 flex-1">
                <AlertTitle>{t("courseDetails.printHintTitle")}</AlertTitle>
                <AlertDescription className="mt-1.5">
                  {t("courseDetails.printHintBody")}
                </AlertDescription>
              </div>
              <div className="flex items-start gap-2">
                <PrintOptionsMenu
                  onPrint={() => window.print()}
                  onPrintOptionsChange={setPrintOptions}
                  printAnswerStyleBoxLabel={t("courseDetails.printAnswerStyleBox")}
                  printAnswerStyleEmptyLabel={t("courseDetails.printAnswerStyleEmpty")}
                  printAnswerStyleLabel={t("courseDetails.printAnswerStyle")}
                  printAnswerStyleLinesLabel={t("courseDetails.printAnswerStyleLines")}
                  printHeaderLabel={t("courseDetails.printOptionHeader")}
                  printNowLabel={t("courseDetails.printNow")}
                  printOptions={printOptions}
                  printTestSeparatorsLabel={t("courseDetails.printOptionSeparators")}
                  showAnswerStyleOptions
                  showTestSeparatorsOption
                  title={t("courseDetails.printOptions")}
                >
                  <Button
                    aria-label={t("courseDetails.printCourse")}
                    className="rounded-full"
                    size="icon"
                    variant="secondary"
                  >
                    <Printer aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </PrintOptionsMenu>
                <button
                  aria-label={t("courseDetails.dismissPrintHint")}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-sky-950 transition-colors hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50"
                  onClick={() => setIsPrintHintVisible(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Alert>
        )}
        <CourseTestContent
          activeTestExercises={activeTestExercises}
          activeTestInstances={activeTestInstances}
          exerciseAnswers={exerciseAnswers}
          exerciseResults={exerciseResults}
          isTestPassed={isTestPassed}
          onContinueAfterExercise={moveToNextLesson}
          onSubmitExercise={submitExercise}
          onUpdateExerciseAnswer={updateExerciseAnswer}
          printAnswerStyle={printOptions.answerStyle}
          showPrintTestSeparators={printOptions.showTestSeparators}
          testFeedback={testFeedback}
        />
      </div>
    </>
  );
}
