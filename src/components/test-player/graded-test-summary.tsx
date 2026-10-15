import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExercisePromptHeader } from "@/components/course-player/exercise-prompt-header";
import type { ExerciseResult } from "@/components/test-player/use-test-player-state";
import { AnswerMark } from "@/components/ui/answer-mark";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import type { CourseExercise } from "@/lib/course-package";
import { getExercisePromptSource, type ExerciseInstance } from "@/lib/course-player-utils";
import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry";
import { exercisePoints } from "@/lib/grade-bands";
import { useEnterKey } from "@/lib/use-enter-key";

type Status = "partial" | "right" | "wrong";

// After a graded test, from its results card (SLJ-140): every question as
// answered, read-only, with the points it earned, what the student gave and,
// where it was wrong, the correct answer. Right is green, partly right
// orange, wrong red; the correct answer green. Kinds whose answer is drawn on
// a diagram or text show right or wrong only.
export function GradedTestSummary({
  answers,
  exercises,
  instances,
  onBack,
  onContinue,
  partialCredit,
  results,
}: {
  answers: string[];
  exercises: CourseExercise[];
  instances: ExerciseInstance[];
  onBack: () => void;
  onContinue: () => void;
  partialCredit: boolean;
  results: ExerciseResult[];
}) {
  const { t } = useTranslation();
  useEnterKey(onContinue);

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 py-6" data-testid="graded-test-summary">
      <CardTitle size="lg">{t("courseDetails.summaryTitle")}</CardTitle>
      {exercises.map((exercise, index) => {
        const instance = instances[index];
        const result = results[index];
        if (!instance || !result) return null;
        const points = exercisePoints(exercise);
        const share = result.isCorrect ? 1 : partialCredit ? result.share : 0;
        const status: Status = result.isCorrect ? "right" : share > 0 ? "partial" : "wrong";
        const { ReviewComponent } = getExerciseKindEditor(exercise.kind);
        const parts = ReviewComponent
          ? undefined
          : getExerciseKindRuntime(exercise.kind).review?.(exercise, instance, answers[index] ?? "");

        return (
          <div
            className="flex flex-col gap-3 border-b border-border pb-5 last:border-b-0"
            data-status={status}
            data-testid="summary-question"
            key={exercise.id}
          >
            <div className="flex items-start justify-between gap-3">
              <ExercisePromptHeader index={index} promptSource={getExercisePromptSource(exercise, instance)} />
              <div className="flex shrink-0 items-center gap-2">
                <AnswerMark tone={status}>{t(`courseDetails.summaryStatus.${status}`)}</AnswerMark>
                <CardDescription className="tabular-nums" data-testid="summary-points">
                  {t("courseDetails.gradedPoints", { maxPoints: points, points: Math.round(points * share) })}
                </CardDescription>
              </div>
            </div>
            {ReviewComponent && (
              <ReviewComponent exercise={exercise as never} instance={instance} value={answers[index] ?? ""} />
            )}
            {parts && (
              <div className="flex flex-col gap-2">
                {parts.map((part, partIndex) => (
                  <div className="flex flex-wrap items-center gap-2" key={partIndex}>
                    {part.label && <CardDescription className="min-w-24">{part.label}</CardDescription>}
                    <CardDescription>{t("courseDetails.summaryYourAnswer")}</CardDescription>
                    <AnswerMark data-testid="summary-answer" tone={part.isCorrect ? "right" : "wrong"}>
                      {part.answer || t("courseDetails.summaryNoAnswer")}
                    </AnswerMark>
                    {!part.isCorrect && (
                      <>
                        <CardDescription>{t("courseDetails.summaryCorrectAnswer")}</CardDescription>
                        <AnswerMark data-testid="summary-solution" tone="solution">
                          {part.solution}
                        </AnswerMark>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap justify-end gap-3">
        <Button onClick={onBack} size="lg" variant="secondary">
          <ArrowLeft aria-hidden="true" />
          {t("courseDetails.summaryBack")}
        </Button>
        <Button onClick={onContinue} size="lg">
          {t("continue")}
        </Button>
      </div>
    </div>
  );
}
