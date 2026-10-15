import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { GradeScore } from "@/components/ui/grade-score";
import { TracingBorder } from "@/components/ui/tracing-border";
import { celebrationColor, type GradeBand, type GradeBandColor, gradeBandColor, scorePercent } from "@/lib/grade-bands";

// The end of a graded test (SLJ-135): the percentage in its grade band's
// colour, the points it comes from, and whether it's the student's best yet.
// No list of mistakes and nothing red: Try again is there instead.
export function GradedTestResult({
  bands,
  isNewBest,
  maxPoints,
  onContinue,
  onTryAgain,
  points,
  questionCount,
}: {
  bands: GradeBand[];
  isNewBest: boolean;
  maxPoints: number;
  onContinue: () => void;
  onTryAgain: () => void;
  points: number;
  questionCount: number;
}) {
  const { t } = useTranslation();
  const percent = scorePercent(points, maxPoints);
  // The two highest bands get the drawn border (`celebrationColor`).
  const celebration = celebrationColor(percent, bands, questionCount);

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6">
      <CelebratedCard tone={celebration}>
        <Card data-testid="graded-test-result">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <CardTitle size="lg">{t("courseDetails.gradedResultTitle")}</CardTitle>
            <GradeScore data-testid="graded-test-percent" tone={gradeBandColor(percent, bands)}>
              {t("courseDetails.gradedPercent", { percent })}
            </GradeScore>
            <CardDescription className="text-base" data-testid="graded-test-points">
              {t("courseDetails.gradedPoints", { maxPoints, points })}
            </CardDescription>
            {isNewBest && <Badge variant="success">{t("courseDetails.newBest")}</Badge>}
            <div className="flex w-full flex-wrap justify-center gap-3 pt-2">
              <Button onClick={onTryAgain} size="lg" variant="secondary">
                <RotateCcw aria-hidden="true" />
                {t("courseDetails.tryAgain")}
              </Button>
              <Button onClick={onContinue} size="lg">
                {t("continue")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </CelebratedCard>
    </div>
  );
}

// The card, in a drawn border when the result is celebrated.
export function CelebratedCard({ children, tone }: { children: React.ReactNode; tone: GradeBandColor | null }) {
  return tone ? <TracingBorder tone={tone}>{children}</TracingBorder> : <>{children}</>;
}
