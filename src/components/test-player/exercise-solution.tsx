import { useTranslation } from "react-i18next";

import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import { AnswerMark } from "@/components/ui/answer-mark";
import { CardDescription } from "@/components/ui/card";
import type { CourseExercise } from "@/lib/course-package";
import type { ExerciseInstance } from "@/lib/course-player-utils";
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry";

// An exercise's correct answer, shown when a student asks for it after a
// wrong one in a practice test (SLJ-141). The same as the graded summary
// shows (SLJ-140): a diagram kind draws it on its picture, the others list
// each part's solution, in green.
export function ExerciseSolution({
  answer,
  exercise,
  instance,
}: {
  answer: string;
  exercise: CourseExercise;
  instance: ExerciseInstance;
}) {
  const { t } = useTranslation();
  const { ReviewComponent, reviewIsLabelled } = getExerciseKindEditor(exercise.kind);

  if (ReviewComponent) {
    return (
      <div className="flex flex-col gap-2" data-testid="exercise-solution">
        {!reviewIsLabelled && <CardDescription>{t("courseDetails.correctAnswerShown")}</CardDescription>}
        <ReviewComponent exercise={exercise as never} instance={instance} value={answer} />
      </div>
    );
  }

  const parts = getExerciseKindRuntime(exercise.kind).review?.(exercise, instance, answer) ?? [];

  return (
    <div className="flex flex-col gap-2" data-testid="exercise-solution">
      <CardDescription>{t("courseDetails.correctAnswerShown")}</CardDescription>
      {parts.map((part, index) => (
        <div className="flex flex-wrap items-center gap-2" key={index}>
          {part.label && <CardDescription className="min-w-24">{part.label}</CardDescription>}
          <AnswerMark data-testid="exercise-solution-value" tone="solution">
            {part.solution}
          </AnswerMark>
        </div>
      ))}
    </div>
  );
}
