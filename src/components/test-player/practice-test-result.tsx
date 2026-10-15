import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { StreakCounter } from "@/components/ui/streak-counter";
import { CelebratedCard } from "@/components/test-player/graded-test-result";
import { spreeLevel } from "@/lib/course-progress";
import { celebrationColor, type GradeBand, scorePercent } from "@/lib/grade-bands";

export type PracticeTestResultValue = {
  cheerKey: string;
  correct: number;
  // This run beat the test's longest streak so far.
  isNewBestStreak: boolean;
  longestStreak: number;
  // The course's spree reached a new best during this test, or null.
  newBestSpree: number | null;
  total: number;
};

// The end of a practice test: a pep talk, the run's longest streak of right
// first tries (and whether it's the best yet), and the first-try score. A
// teacher's preview says its result isn't kept.
export function PracticeTestResult({
  bands,
  isPreview,
  onContinue,
  onTryAgain,
  result,
}: {
  // The course's grade bands: a run's first-try share in one of the two
  // highest gets the drawn border.
  bands: GradeBand[];
  isPreview: boolean;
  onContinue: () => void;
  onTryAgain: () => void;
  result: PracticeTestResultValue;
}) {
  const { t } = useTranslation();
  const celebration = celebrationColor(scorePercent(result.correct, result.total), bands, result.total);

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6">
      <CelebratedCard tone={celebration}>
        <Card data-testid="practice-test-result">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <CardTitle data-testid="practice-test-cheer" size="lg">
              {t(result.cheerKey)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <CardDescription aria-hidden="true" className="text-base">
                {t("courseDetails.practiceLongestStreak")}
              </CardDescription>
              <StreakCounter
                aria-label={t("courseDetails.practiceLongestStreakCount", { count: result.longestStreak })}
                count={result.longestStreak}
                data-testid="practice-test-streak"
                level={spreeLevel(result.longestStreak)}
              />
            </div>
            <CardDescription data-testid="practice-test-first-try">
              {t("courseDetails.practiceFirstTry", { correct: result.correct, total: result.total })}
            </CardDescription>
            {(result.isNewBestStreak || result.newBestSpree !== null) && (
              <div className="flex flex-wrap justify-center gap-2">
                {result.isNewBestStreak && <Badge variant="success">{t("courseDetails.newBest")}</Badge>}
                {result.newBestSpree !== null && (
                  <Badge variant="warning">{t("courseDetails.newBestSpree", { count: result.newBestSpree })}</Badge>
                )}
              </div>
            )}
            <div className="flex w-full flex-wrap justify-center gap-3 pt-2">
              <Button onClick={onTryAgain} size="lg" variant="secondary">
                <RotateCcw aria-hidden="true" />
                {t("courseDetails.tryAgain")}
              </Button>
              <Button onClick={onContinue} size="lg">
                {t("continue")}
              </Button>
            </div>
            {isPreview && <CardDescription>{t("courseDetails.previewNotSaved")}</CardDescription>}
          </CardContent>
        </Card>
      </CelebratedCard>
    </div>
  );
}
