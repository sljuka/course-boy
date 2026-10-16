import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import { marksFromText, updateMarks, updatePrompt, updateText, validate } from "@/components/exercise-kinds/punctuation-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import type { PunctuationTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PUNCTUATION_MARKS, joinPunctuationSentence, parsePunctuationText } from "@/lib/punctuation";

// A punctuation exercise's fields (SLJ-145): the prompt, the sentence written
// with its marks, and which marks the student places. Below, the sentence as
// the student first sees it (no marks), so the teacher can check what's
// taken out.
export function PunctuationExerciseFields({
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<PunctuationTestExercise>) {
  const { t } = useTranslation();
  const content = exercise.locales[locale];
  const text = content?.text ?? "";
  const validation = validate(exercise, locale);
  const marks = marksFromText(exercise.marks);
  const { gaps, words } = parsePunctuationText(text, marks);
  const placed = gaps.filter(Boolean).length;

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>{t("punctuation.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) => onChange((current) => updatePrompt(current, locale, event.target.value))}
          placeholder={t("punctuation.promptPlaceholder")}
          rows={2}
          value={content?.prompt ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`exercise-text-${exercise.id}-${locale}`}>{t("punctuation.textLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-text-${exercise.id}-${locale}`}
          onChange={(event) => onChange((current) => updateText(current, locale, event.target.value))}
          placeholder={t("punctuation.textPlaceholder")}
          rows={2}
          value={text}
        />
        <FieldDescription>{t("punctuation.textHelp")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={`exercise-marks-${exercise.id}`}>{t("punctuation.marksLabel")}</FieldLabel>
        <Input
          id={`exercise-marks-${exercise.id}`}
          onChange={(event) => onChange((current) => updateMarks(current, event.target.value))}
          placeholder={DEFAULT_PUNCTUATION_MARKS.join(" ")}
          value={exercise.marks}
        />
        <FieldDescription>{t("punctuation.marksHelp")}</FieldDescription>
      </Field>

      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {validation.status === "valid" ? t("punctuation.valid") : t("punctuation.invalid")}
          </Badge>
          <CardDescription>
            {validation.status === "valid" ? t("punctuation.marksToPlace", { count: placed }) : t("punctuation.needsMarks")}
          </CardDescription>
        </div>
      )}

      {words.length > 0 && placed > 0 && (
        <Card className="overflow-visible p-3" data-testid="punctuation-preview">
          <CardDescription>{t("punctuation.previewLabel")}</CardDescription>
          <span>{joinPunctuationSentence(words, gaps.map(() => ""))}</span>
        </Card>
      )}
      {moreOptions && (
        <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>
      )}
    </>
  );
}
