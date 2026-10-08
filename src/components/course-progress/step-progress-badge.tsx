import { Check, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { StepProgress } from "@/lib/course-progress";

// Under a lesson, test or section intro on the course page (SLJ-50): Done once
// the student moved past it, and for a test its best streak (first-try
// correct answers in a row, out of all its exercises) beside it; the
// streak's tooltip has the best score and the number of attempts. Nothing
// before it's done.
export function StepProgressBadge({ step }: { step: StepProgress | undefined }) {
  const { t } = useTranslation();

  if (!step?.doneAt) {
    return null;
  }

  const best = step.test?.best;

  return (
    <div className="flex flex-wrap justify-center gap-1">
      <Badge data-testid="step-progress-done" variant="success">
        <Check aria-hidden="true" />
        {t("courseProgress.done")}
      </Badge>
      {best && step.test && (
        <Badge
          aria-label={t("courseProgress.streakLabel", { streak: best.longestStreak, total: best.total })}
          data-testid="step-progress-streak"
          title={t("courseProgress.streakDetails", {
            attempts: step.test.attempts,
            correct: best.correct,
            total: best.total,
          })}
          variant="warning"
        >
          <Zap aria-hidden="true" />
          {t("courseProgress.streak", { streak: best.longestStreak, total: best.total })}
        </Badge>
      )}
    </div>
  );
}
