import { useTranslation } from "react-i18next";

import type { RewriteCourseExercise, SharedRewriteTestExerciseDefinition } from "@/lib/course-package";
import { closestRewriteSolution, diffRewrite, matchesRewrite, type RewriteSegment, rewritePrintRows } from "@/lib/rewrite";

import { PrintAnswerArea } from "@/components/course-player/print-answer-area";
import { RewriteExerciseFields } from "@/components/rewrite-exercise-fields";
import type { RewriteTestExercise } from "@/components/test-editor-prototype-types";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
  ReviewComponentProps,
} from "@/components/exercise-kinds/types";
import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/rewrite-logic";
import { AnswerMark } from "@/components/ui/answer-mark";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { MarkedText, MarkedTextPiece } from "@/components/ui/marked-text";
import { Textarea } from "@/components/ui/textarea";

// The sentence to rewrite, when the exercise has one.
function Source({ source }: { source: string }) {
  return source ? (
    <Card data-testid="rewrite-source" size="sm">
      <CardContent className="whitespace-pre-line">{source}</CardContent>
    </Card>
  ) : null;
}

// The sentence to rewrite, and a field that grows with what the student
// writes (SLJ-146). Enter adds a line; the test's own button checks.
function AnswerComponent({ exercise, index, onAnswerChange, value }: AnswerComponentProps<RewriteCourseExercise>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <Source source={exercise.source} />
      <Textarea
        aria-label={t("rewrite.answerLabel")}
        data-testid="rewrite-answer"
        id={`course-exercise-answer-${index}`}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder={t("rewrite.answerPlaceholder")}
        rows={3}
        value={value}
      />
    </div>
  );
}

// On paper: the sentence to rewrite, then room to write, as long as the
// longest solution needs.
function PrintAnswerComponent({ exercise, printAnswerStyle }: PrintAnswerComponentProps<RewriteCourseExercise>) {
  return (
    <div className="hidden flex-col gap-3 print:flex">
      <Source source={exercise.source} />
      <PrintAnswerArea printAnswerStyle={printAnswerStyle} rows={rewritePrintRows(exercise.solutions)} />
    </div>
  );
}

function Segments({ mark, segments }: { mark: "missing" | "wrong"; segments: RewriteSegment[] }) {
  return segments.map((segment, index) =>
    segment.changed ? (
      <MarkedTextPiece key={index} mark={mark}>
        {segment.text}
      </MarkedTextPiece>
    ) : (
      segment.text
    ),
  );
}

// The answer against the nearest solution, word by word (SLJ-146): in the
// answer, what to fix; in the solution, what was missing. For the correct
// answer shown after a wrong one, and the graded summary.
function ReviewComponent({ exercise, value }: ReviewComponentProps<RewriteCourseExercise>) {
  const { t } = useTranslation();
  const answer = value.trim();

  if (answer && matchesRewrite(answer, exercise.solutions, exercise)) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <CardDescription>{t("courseDetails.summaryYourAnswer")}</CardDescription>
        <AnswerMark data-testid="summary-answer" tone="right">
          {answer}
        </AnswerMark>
      </div>
    );
  }

  const solution = closestRewriteSolution(answer, exercise.solutions, exercise);
  const diff = diffRewrite(answer, solution, exercise);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CardDescription>{t("courseDetails.summaryYourAnswer")}</CardDescription>
        {answer ? (
          <MarkedText data-testid="rewrite-review-answer">
            <Segments mark="wrong" segments={diff.answer} />
          </MarkedText>
        ) : (
          <AnswerMark data-testid="summary-answer">{t("courseDetails.summaryNoAnswer")}</AnswerMark>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <CardDescription>{t("courseDetails.summaryCorrectAnswer")}</CardDescription>
        <MarkedText data-testid="rewrite-review-solution" tone="solution">
          {/* Nothing written: the solution plain, rather than all of it marked. */}
          {answer ? <Segments mark="missing" segments={diff.solution} /> : solution}
        </MarkedText>
      </div>
    </div>
  );
}

export const rewriteExerciseEditor: ExerciseKindEditor<
  RewriteTestExercise,
  SharedRewriteTestExerciseDefinition,
  RewriteCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: RewriteExerciseFields,
  PrintAnswerComponent,
  ReviewComponent,
  reviewIsLabelled: true,
  createExercise,
  description: "The student writes a sentence (or a few); it's right when it matches any of the answers you give.",
  fromShared,
  kind: "rewrite",
  label: "Rewrite",
  toShared,
  validate,
};
