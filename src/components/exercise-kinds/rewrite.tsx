import { useTranslation } from "react-i18next";

import type { RewriteCourseExercise, SharedRewriteTestExerciseDefinition } from "@/lib/course-package";
import { rewritePrintRows } from "@/lib/rewrite";

import { PrintAnswerArea } from "@/components/course-player/print-answer-area";
import { RewriteExerciseFields } from "@/components/rewrite-exercise-fields";
import type { RewriteTestExercise } from "@/components/test-editor-prototype-types";
import type {
  AnswerComponentProps,
  ExerciseKindEditor,
  PrintAnswerComponentProps,
} from "@/components/exercise-kinds/types";
import { createExercise, fromShared, toShared, validate } from "@/components/exercise-kinds/rewrite-logic";
import { Card, CardContent } from "@/components/ui/card";
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

export const rewriteExerciseEditor: ExerciseKindEditor<
  RewriteTestExercise,
  SharedRewriteTestExerciseDefinition,
  RewriteCourseExercise
> = {
  AnswerComponent,
  FieldsComponent: RewriteExerciseFields,
  PrintAnswerComponent,
  createExercise,
  description: "The student writes a sentence (or a few); it's right when it matches any of the answers you give.",
  fromShared,
  kind: "rewrite",
  label: "Rewrite",
  toShared,
  validate,
};
