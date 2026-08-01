import { useTranslation } from "react-i18next";

import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { PrintAnswerBoxArea } from "@/components/course-player/print-answer-box-area";
import { PrintAnswerLinesArea } from "@/components/course-player/print-answer-lines-area";
import { PrintAnswerSquaresArea } from "@/components/course-player/print-answer-squares-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseExercise } from "@/lib/course-package";
import {
  interpolateTemplate,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import type {
  CoursePrintAnswerStyle,
  CoursePrintExerciseHintStyle,
} from "@/lib/print-options";
import { cn } from "@/lib/utils";

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

function resolveSolutionSpaceRows(solutionSpace: CourseExercise["solutionSpace"]) {
  if (typeof solutionSpace === "number") {
    return solutionSpace;
  }

  switch (solutionSpace) {
    case "md":
      return 3;
    case "lg":
      return 5;
    case "xl":
      return 8;
    case "sm":
    default:
      return 1;
  }
}

function resolvePrintAnswerAreaMinHeight(rows: number) {
  return `${rows === 1 ? 3.25 : rows * 2.75}rem`;
}

export const CourseTestContent = ({
  activeTestExercises,
  activeTestInstances,
  exerciseAnswers,
  exerciseResults,
  isTestPassed,
  onContinueAfterExercise,
  onSubmitExercise,
  onUpdateExerciseAnswer,
  printAnswerStyle,
  printExerciseHintStyle,
  showPrintTestSeparators,
  testFeedback,
}: {
  activeTestExercises: CourseExercise[];
  activeTestInstances: ExerciseInstance[];
  exerciseAnswers: string[];
  exerciseResults: ExerciseResult[];
  isTestPassed: boolean;
  onContinueAfterExercise: () => void;
  onSubmitExercise: () => void;
  onUpdateExerciseAnswer: (index: number, value: string) => void;
  printAnswerStyle: CoursePrintAnswerStyle;
  printExerciseHintStyle: CoursePrintExerciseHintStyle;
  showPrintTestSeparators: boolean;
  testFeedback: string | null;
}) => {
  const { t } = useTranslation();

  if (
    activeTestExercises.length === 0 ||
    activeTestInstances.length !== activeTestExercises.length
  ) {
    return null;
  }

  const printableHints = activeTestExercises.flatMap((exercise, index) => {
    const exerciseInstance = activeTestInstances[index];

    if (!exercise.hint || !exerciseInstance) {
      return [];
    }

    return [
      {
        hint: interpolateTemplate(exercise.hint, exerciseInstance.variables),
        id: exercise.id,
        index,
      },
    ];
  });

  return (
    <div className="flex flex-col gap-4 print:min-h-[240mm]">
      <div className="flex flex-col gap-4">
        {activeTestExercises.map((exercise, index) => {
          const exerciseInstance = activeTestInstances[index];
          const exerciseResult = exerciseResults[index];
          const solutionRows = resolveSolutionSpaceRows(exercise.solutionSpace);

          if (!exerciseInstance) {
            return null;
          }

          return (
            <div
              className={`flex break-inside-avoid flex-col gap-3 border-b border-stone-200 pb-4 last:border-b-0 last:pb-0 print:gap-3 print:pb-3 ${
                showPrintTestSeparators ? "" : "print:border-b-0"
              }`}
              key={exercise.id}
            >
              <p className="flex items-start gap-1.5 text-base leading-7 text-stone-700">
                <Badge
                  className="size-6 shrink-0 justify-center"
                  variant="secondary"
                >
                  {index + 1}
                </Badge>
                <InlineMarkdown
                  source={interpolateTemplate(
                    exercise.prompt,
                    exerciseInstance.variables,
                  )}
                />
              </p>
              <div className="flex max-w-xs flex-col gap-3 print:hidden">
                <Input
                  id={`course-exercise-answer-${index}`}
                  onChange={(event) =>
                    onUpdateExerciseAnswer(index, event.target.value)
                  }
                  placeholder={t("courseDetails.answerPlaceholder")}
                  value={exerciseAnswers[index] ?? ""}
                />
              </div>
              <div className="hidden print:block">
                {printAnswerStyle === "lines" ? (
                  <PrintAnswerLinesArea rows={solutionRows} />
                ) : printAnswerStyle === "box" ? (
                  <PrintAnswerBoxArea rows={solutionRows} />
                ) : printAnswerStyle === "squares" ? (
                  <PrintAnswerSquaresArea rows={solutionRows} />
                ) : (
                  <div
                    className="bg-transparent"
                    style={{
                      minHeight: resolvePrintAnswerAreaMinHeight(solutionRows),
                    }}
                  />
                )}
              </div>
              {exerciseResult?.feedback && (
                <div className="text-sm font-medium text-rose-700 print:hidden">
                  {exerciseResult.feedback}
                </div>
              )}
            </div>
          );
        })}
        {testFeedback && (
          <div
            className={
              isTestPassed
                ? "text-sm font-medium text-emerald-700 print:hidden"
                : "text-sm font-medium text-rose-700 print:hidden"
            }
          >
            {testFeedback}
          </div>
        )}
        <div className="flex justify-end gap-3 print:hidden">
          <Button
            onClick={() =>
              isTestPassed ? onContinueAfterExercise() : onSubmitExercise()
            }
            size="lg"
          >
            {isTestPassed ? t("continue") : t("courseDetails.checkAnswer")}
          </Button>
        </div>
      </div>
      {printExerciseHintStyle !== "hidden" && printableHints.length > 0 && (
        <div className="hidden break-inside-avoid pt-4 print:mt-6 print:block">
          <div
            className={cn(
              "rounded-lg border border-stone-200 px-3 py-2 text-xs leading-5 text-stone-600",
              printExerciseHintStyle === "upside-down" && "rotate-180",
            )}
          >
            <div className="mb-1 font-semibold uppercase tracking-[0.12em] text-stone-500">
              {t("courseDetails.printExerciseHints")}
            </div>
            <div className="space-y-1">
              {printableHints.map((hintItem) => (
                <p key={`${hintItem.id}-print-hint`}>
                  <span className="font-medium text-stone-600">
                    {hintItem.index + 1}.
                  </span>{" "}
                  <InlineMarkdown source={hintItem.hint} />
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
