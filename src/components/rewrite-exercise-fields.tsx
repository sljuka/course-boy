import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import {
  addSolution,
  removeSolution,
  updateLocale,
  updateSolution,
  validate,
} from "@/components/exercise-kinds/rewrite-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import type { RewriteTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// A rewrite exercise's fields (SLJ-146): the prompt, the sentence to rewrite
// (optional), every answer that counts as right, and how strictly answers
// are compared.
export function RewriteExerciseFields({ exercise, locale, moreOptions, onChange }: FieldsComponentProps<RewriteTestExercise>) {
  const { t } = useTranslation();
  const content = exercise.locales[locale];
  const solutions = content?.solutions ?? [""];
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `exercise-${name}-${exercise.id}-${locale}`;

  return (
    <>
      <Field>
        <FieldLabel htmlFor={fieldId("prompt")}>{t("rewrite.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={fieldId("prompt")}
          onChange={(event) => onChange((current) => updateLocale(current, locale, { prompt: event.target.value }))}
          placeholder={t("rewrite.promptPlaceholder")}
          rows={2}
          value={content?.prompt ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("source")}>{t("rewrite.sourceLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={fieldId("source")}
          onChange={(event) => onChange((current) => updateLocale(current, locale, { source: event.target.value }))}
          placeholder={t("rewrite.sourcePlaceholder")}
          rows={2}
          value={content?.source ?? ""}
        />
        <FieldDescription>{t("rewrite.sourceHelp")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>{t("rewrite.solutionsLabel")}</FieldLabel>
        <div className="flex flex-col gap-2">
          {solutions.map((solution, index) => (
            <div className="flex items-start gap-2" key={index}>
              <Textarea
                aria-label={t("rewrite.solutionLabel", { number: index + 1 })}
                className="min-h-0 flex-1 resize-none overflow-hidden"
                data-testid="rewrite-solution"
                onChange={(event) => onChange((current) => updateSolution(current, locale, index, event.target.value))}
                placeholder={t("rewrite.solutionPlaceholder")}
                rows={1}
                value={solution}
              />
              <Button
                aria-label={t("rewrite.removeSolution", { number: index + 1 })}
                onClick={() => onChange((current) => removeSolution(current, locale, index))}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button onClick={() => onChange((current) => addSolution(current, locale))} size="sm" type="button" variant="secondary">
            <Plus aria-hidden="true" />
            {t("rewrite.addSolution")}
          </Button>
        </div>
        <FieldDescription>{t("rewrite.solutionsHelp")}</FieldDescription>
      </Field>

      <div className="flex flex-col gap-2">
        <Label>
          <Checkbox
            checked={exercise.matchCase}
            onCheckedChange={(checked) => onChange((current) => ({ ...current, matchCase: checked }))}
          />
          {t("rewrite.matchCase")}
        </Label>
        <Label>
          <Checkbox
            checked={exercise.matchQuotes}
            onCheckedChange={(checked) => onChange((current) => ({ ...current, matchQuotes: checked }))}
          />
          {t("rewrite.matchQuotes")}
        </Label>
        <Label>
          <Checkbox
            checked={exercise.acceptWithoutDiacritics}
            onCheckedChange={(checked) => onChange((current) => ({ ...current, acceptWithoutDiacritics: checked }))}
          />
          {t("rewrite.acceptWithoutDiacritics")}
        </Label>
      </div>

      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {validation.status === "valid" ? t("rewrite.valid") : t("rewrite.invalid")}
          </Badge>
          <CardDescription>
            {validation.status === "valid"
              ? t("rewrite.solutionCount", { count: solutions.filter((solution) => solution.trim()).length })
              : t("rewrite.needsSolution")}
          </CardDescription>
        </div>
      )}
      {moreOptions && (
        <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>
      )}
    </>
  );
}
