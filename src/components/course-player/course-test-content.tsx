import { useTranslation } from "react-i18next";

import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseExercise } from "@/lib/course-package";
import {
  interpolateTemplate,
  type ExerciseInstance,
} from "@/lib/course-player-utils";
import type { CoursePrintAnswerStyle } from "@/lib/print-options";

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

  return (
    <div className="flex flex-col gap-4">
      {activeTestExercises.map((exercise, index) => {
        const exerciseInstance = activeTestInstances[index];
        const exerciseResult = exerciseResults[index];

        if (!exerciseInstance) {
          return null;
        }

        return (
          <div
            className={`flex break-inside-avoid flex-col gap-3 border-b border-stone-200 pb-4 last:border-b-0 last:pb-0 print:gap-3 ${
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
                <div className="flex flex-col gap-3">
                  {Array.from({
                    length: resolveSolutionSpaceRows(exercise.solutionSpace),
                  }).map((_, rowIndex) => (
                    <div
                      className="h-8 border-b border-stone-500"
                      key={`${exercise.id}-solution-row-${rowIndex + 1}`}
                    />
                  ))}
                </div>
              ) : printAnswerStyle === "box" ? (
                <div
                  className="rounded-md border border-dashed border-stone-300"
                  style={{
                    minHeight: `${resolveSolutionSpaceRows(exercise.solutionSpace) * 2.75}rem`,
                  }}
                />
              ) : (
                <div
                  className="bg-transparent"
                  style={{
                    minHeight: `${resolveSolutionSpaceRows(exercise.solutionSpace) * 2.75}rem`,
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
  );
};
