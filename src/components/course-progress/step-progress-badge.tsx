import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { StepProgress } from "@/lib/course-progress";

// Under a lesson or test on the course page (SLJ-50): a finished test's best
// score (its tooltip: the longest streak and how many attempts), a finished
// lesson's Done; nothing before it's done.
export function StepProgressBadge({ step }: { step: StepProgress | undefined }) {
  const { t } = useTranslation();

  if (step?.test) {
    const { attempts, best } = step.test;

    return (
      <Badge
        data-testid="step-progress-score"
        title={t("courseProgress.scoreDetails", { attempts, streak: best.longestStreak })}
        variant={best.correct === best.total ? "success" : "secondary"}
      >
        {t("courseProgress.score", { correct: best.correct, total: best.total })}
      </Badge>
    );
  }

  if (step?.doneAt) {
    return (
      <Badge data-testid="step-progress-done" variant="success">
        <Check aria-hidden="true" />
        {t("courseProgress.done")}
      </Badge>
    );
  }

  return null;
}
