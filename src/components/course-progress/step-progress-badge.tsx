import { Check, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { GradeScoreBadge } from "@/components/ui/grade-score";
import type { StepProgress } from "@/lib/course-progress";
import { DEFAULT_GRADE_BANDS, type GradeBand, gradeBandColor, scorePercent } from "@/lib/grade-bands";

// Under a lesson, test or section intro on the course page (SLJ-50): Done once
// the student moved past it, and for a test its best result beside it. A
// practice test's is its best streak (first-try correct answers in a row,
// out of all its exercises), with the best score and the number of attempts
// in its tooltip; a graded test's (SLJ-135) is its best score, "66/88", in
// its grade band's colour. Nothing before it's done.
export function StepProgressBadge({
  gradeBands = DEFAULT_GRADE_BANDS,
  step,
}: {
  gradeBands?: GradeBand[];
  step: StepProgress | undefined;
}) {
  const { t } = useTranslation();

  if (!step?.doneAt) {
    return null;
  }

  const best = step.test?.best;
  const isGraded = best?.points !== undefined && best.maxPoints !== undefined;

  return (
    <div className="flex flex-wrap justify-center gap-1">
      <Badge data-testid="step-progress-done" variant="success">
        <Check aria-hidden="true" />
        {t("courseProgress.done")}
      </Badge>
      {best && step.test && isGraded && (
        <GradeScoreBadge
          data-testid="step-progress-score"
          title={t("courseProgress.scoreDetails", {
            attempts: step.test.attempts,
            percent: scorePercent(best.points!, best.maxPoints!),
          })}
          tone={gradeBandColor(scorePercent(best.points!, best.maxPoints!), gradeBands)}
        >
          {t("courseProgress.score", { maxPoints: best.maxPoints, points: best.points })}
        </GradeScoreBadge>
      )}
      {best && step.test && !isGraded && (
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
