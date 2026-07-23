import { useTranslation } from "react-i18next";

import { InlineMarkdown } from "@/components/course-player/inline-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CourseExercise } from "@/lib/course-package";
import { interpolateTemplate, type ExerciseInstance } from "@/lib/course-player-utils";

type ExerciseResult = {
  feedback: string | null;
  isCorrect: boolean;
};

export const CourseTestContent = ({
  activeTestExercises,
  activeTestInstances,
  exerciseAnswers,
  exerciseResults,
  isTestPassed,
  onContinueAfterExercise,
  onSubmitExercise,
  onUpdateExerciseAnswer,
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
    <>
      {activeTestExercises.map((exercise, index) => {
        const exerciseInstance = activeTestInstances[index];
        const exerciseResult = exerciseResults[index];

        if (!exerciseInstance) {
          return null;
        }

        return (
          <div
            className="flex flex-col gap-3 border-b border-stone-200 pb-6 last:border-b-0 last:pb-0"
            key={exercise.id}
          >
            <p className="flex items-start gap-1.5 text-base leading-7 text-stone-700">
              <Badge
                className="mt-0.5 size-6 shrink-0 justify-center rounded-full px-0 py-0"
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
            <div className="flex max-w-xs flex-col gap-3">
              <label
                className="text-sm font-medium text-stone-700"
                htmlFor={`course-exercise-answer-${index}`}
              >
                {t("courseDetails.answerLabel")}
              </label>
              <Input
                id={`course-exercise-answer-${index}`}
                onChange={(event) =>
                  onUpdateExerciseAnswer(index, event.target.value)
                }
                placeholder={t("courseDetails.answerPlaceholder")}
                value={exerciseAnswers[index] ?? ""}
              />
            </div>
            {exerciseResult?.feedback && (
              <div className="text-sm font-medium text-rose-700">
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
              ? "text-sm font-medium text-emerald-700"
              : "text-sm font-medium text-rose-700"
          }
        >
          {testFeedback}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button
          onClick={() =>
            isTestPassed ? onContinueAfterExercise() : onSubmitExercise()
          }
          size="lg"
        >
          {isTestPassed ? t("continue") : t("courseDetails.checkAnswer")}
        </Button>
      </div>
    </>
  );
};
