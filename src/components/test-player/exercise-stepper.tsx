import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * A row of numbered circles standing in for the old linear progress bar —
 * one per exercise, wrapping onto additional rows for tests with enough
 * exercises that a single row wouldn't fit. The overall position is
 * announced once via the group's own `aria-label`; a completed step is a
 * real, individually-labeled button (there's no "Previous" button — this is
 * the only way back to review/redo an earlier answer), while the current
 * and upcoming steps stay purely decorative (`aria-hidden`).
 */
export function ExerciseStepper({
  currentIndex,
  onSelectStep,
  total,
}: {
  currentIndex: number;
  onSelectStep: (index: number) => void;
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
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const circleClassName = cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
          isCurrent && "border-primary bg-primary text-primary-foreground",
          isCompleted && !isCurrent && "border-primary bg-primary/10 text-primary",
          !isCurrent && !isCompleted && "border-border text-muted-foreground",
        );
        const content = isCompleted ? <Check className="h-4 w-4" /> : index + 1;

        if (isCompleted) {
          return (
            <button
              aria-label={t("courseDetails.reviewExercise", { number: index + 1 })}
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
