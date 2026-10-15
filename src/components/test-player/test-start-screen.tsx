import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

// Before the first question in interactive mode (SLJ-137): the test's title,
// its description, and what it is, from what the app knows (how many
// questions; graded, its points, partial credit). Start begins it; it has
// the focus, so Enter does too.
export function TestStartScreen({
  description,
  graded,
  maxPoints,
  onStart,
  partialCredit,
  questionCount,
  title,
}: {
  description?: string;
  graded: boolean;
  maxPoints: number;
  onStart: () => void;
  partialCredit: boolean;
  questionCount: number;
  title: string;
}) {
  const { t } = useTranslation();
  const facts = [
    ...(graded ? [t("courseDetails.startGraded")] : []),
    t("courseDetails.startQuestions", { count: questionCount }),
    ...(graded ? [t("courseDetails.startPoints", { count: maxPoints })] : []),
  ];

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6">
      <Card data-testid="test-start-screen">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
          <CardTitle size="lg">{title}</CardTitle>
          {description && <CardDescription className="text-base">{description}</CardDescription>}
          <CardDescription data-testid="test-start-facts">{facts.join(" · ")}</CardDescription>
          {graded && partialCredit && <Badge variant="secondary">{t("courseDetails.startPartialCredit")}</Badge>}
          <Button autoFocus data-testid="test-start" onClick={onStart} size="lg">
            <Play aria-hidden="true" />
            {t("courseDetails.startTest")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
