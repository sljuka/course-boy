import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * A row of numbered circles standing in for the old linear progress bar —
 * one per exercise, wrapping onto additional rows for tests with enough
 * exercises that a single row wouldn't fit. The overall position is
 * announced once via the group's own `aria-label`. Every step up to the
 * furthest one reached (`reachedIndex`) is a real, individually-labeled
 * button, so a student who went back to an earlier answer can jump forward
 * again: those before it with a check, the furthest with its number (it may
 * not be answered yet). The current and the not-yet-reached steps stay
 * purely decorative (`aria-hidden`).
 *
 * `answered` (a graded test, where Next moves on without an answer): a step
 * passed without one keeps its number, grey, instead of a check, so the
 * student sees what's still empty. It can still be clicked to go back.
 */
export function ExerciseStepper({
  answered,
  currentIndex,
  onSelectStep,
  reachedIndex = currentIndex,
  total,
}: {
  answered?: readonly boolean[];
  currentIndex: number;
  onSelectStep: (index: number) => void;
  reachedIndex?: number;
  total: number;
}) {
  const { t } = useTranslation();

  return (
    <div
      aria-label={t("courseDetails.exerciseProgress", {
        current: currentIndex + 1,
        total,
      })}
      className="flex flex-wrap items-center justify-center gap-2"
      role="group"
    >
      {Array.from({ length: total }, (_, index) => {
        const furthest = Math.max(reachedIndex, currentIndex);
        const isSkipped = index < furthest && answered?.[index] === false;
        const isCompleted = index < furthest && !isSkipped;
        const isCurrent = index === currentIndex;
        const isReachable = !isCurrent && index <= furthest;
        const circleClassName = cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
          isCurrent && "border-primary bg-primary text-primary-foreground",
          isReachable && !isSkipped && "border-primary bg-primary/10 text-primary",
          ((!isCurrent && !isReachable) || (isReachable && isSkipped)) && "border-border text-muted-foreground",
        );
        const content = isCompleted && !isCurrent ? <Check className="h-4 w-4" /> : index + 1;

        if (isReachable) {
          return (
            <button
              aria-label={t(isSkipped ? "courseDetails.reviewUnansweredExercise" : "courseDetails.reviewExercise", {
                number: index + 1,
              })}
              data-skipped={isSkipped ? "" : undefined}
              className={cn(circleClassName, "cursor-pointer hover:opacity-75")}
              key={index}
              onClick={() => onSelectStep(index)}
              type="button"
            >
              {content}
            </button>
          );
        }

        return (
          <div aria-hidden="true" className={circleClassName} key={index}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
