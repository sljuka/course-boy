import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { NumericTestExercise } from "@/components/test-editor-prototype-types";
import { formatSampleVariables, validateFormula } from "@/components/exercise-kinds/numeric-logic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";

type UpdateExercise = (updater: (exercise: NumericTestExercise) => NumericTestExercise) => void;

function createSolutionId() {
  return `solution_${Math.random().toString(36).slice(2, 8)}`;
}

function getValidationLabel(status: "error" | "valid" | "warning") {
  switch (status) {
    case "error":
      return "Invalid";
    case "warning":
      return "Warning";
    case "valid":
      return "Valid";
  }
}

// Every solution's formula, the first being the exercise's own `solution`.
function formulasOf(exercise: NumericTestExercise): string[] {
  return [exercise.solution, ...exercise.moreSolutions.map((solution) => solution.formula)];
}

// Back from a list of formulas: the first is `solution`, the rest keep their ids.
function withFormulas(exercise: NumericTestExercise, formulas: string[]): NumericTestExercise {
  return {
    ...exercise,
    moreSolutions: formulas.slice(1).map((formula, index) => ({
      formula,
      id: exercise.moreSolutions[index]?.id ?? createSolutionId(),
    })),
    solution: formulas[0] ?? "",
  };
}

// Every language's labels, changed by `change` (one label per solution).
function withLabels(
  exercise: NumericTestExercise,
  change: (labels: string[], locale: string) => string[],
): NumericTestExercise {
  return {
    ...exercise,
    locales: Object.fromEntries(
      Object.entries(exercise.locales).map(([locale, content]) => [
        locale,
        { ...content, solutionLabels: change(content.solutionLabels ?? [], locale) },
      ]),
    ),
  };
}

// A numeric exercise's solutions (SLJ-139): one formula, as always, or several,
// each answered in its own box and so each with a label per language
// ("Bob", "Carol"). Every formula is checked with sample values.
export function NumericSolutionsField({
  exercise,
  locale,
  onChange,
}: {
  exercise: NumericTestExercise;
  locale: Locale;
  onChange: UpdateExercise;
}) {
  const { t } = useTranslation();
  const formulas = formulasOf(exercise);
  const isSeveral = formulas.length > 1;
  const labels = exercise.locales[locale]?.solutionLabels ?? [];

  function setFormula(index: number, formula: string) {
    onChange((current) => {
      const next = formulasOf(current);
      next[index] = formula;
      return withFormulas(current, next);
    });
  }

  function setLabel(index: number, label: string) {
    onChange((current) =>
      withLabels(current, (currentLabels, labelLocale) => {
        if (labelLocale !== locale) return currentLabels;
        const next = [...currentLabels];
        next[index] = label;
        return next;
      }),
    );
  }

  function addSolution() {
    onChange((current) => withFormulas(current, [...formulasOf(current), ""]));
  }

  function removeSolution(index: number) {
    onChange((current) =>
      withLabels(
        withFormulas(
          current,
          formulasOf(current).filter((_, i) => i !== index),
        ),
        (currentLabels) => currentLabels.filter((_, i) => i !== index),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="numeric-solutions">
      {formulas.map((formula, index) => (
        <div className="flex flex-col gap-2" key={index === 0 ? "first" : exercise.moreSolutions[index - 1]?.id}>
          {isSeveral && (
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>{t("testEditor.solutionNumber", { index: index + 1 })}</FieldLabel>
              <Button
                aria-label={t("testEditor.removeSolution", { index: index + 1 })}
                onClick={() => removeSolution(index)}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          )}
          {isSeveral && (
            <Field>
              <FieldLabel htmlFor={`exercise-solution-label-${exercise.id}-${index}-${locale}`}>
                {t("testEditor.solutionLabel")}
              </FieldLabel>
              <Input
                aria-invalid={!labels[index]?.trim() || undefined}
                id={`exercise-solution-label-${exercise.id}-${index}-${locale}`}
                onChange={(event) => setLabel(index, event.target.value)}
                placeholder={t("testEditor.solutionLabelPlaceholder")}
                value={labels[index] ?? ""}
              />
              {!labels[index]?.trim() && <FieldError>{t("testEditor.solutionLabelMissing")}</FieldError>}
            </Field>
          )}
          <SolutionFormula
            exercise={exercise}
            formula={formula}
            id={`exercise-solution-${exercise.id}${index === 0 ? "" : `-${index}`}`}
            locale={locale}
            onChange={(next) => setFormula(index, next)}
            showLabel={!isSeveral}
          />
        </div>
      ))}
      <div>
        <Button data-testid="add-solution" onClick={addSolution} size="sm" variant="secondary">
          <Plus aria-hidden="true" />
          {t("testEditor.addSolution")}
        </Button>
      </div>
    </div>
  );
}

function SolutionFormula({
  exercise,
  formula,
  id,
  locale,
  onChange,
  showLabel,
}: {
  exercise: NumericTestExercise;
  formula: string;
  id: string;
  locale: Locale;
  onChange: (formula: string) => void;
  showLabel: boolean;
}) {
  const { t } = useTranslation();
  const validation = useMemo(() => validateFormula(exercise, locale, formula), [exercise, formula, locale]);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{showLabel ? "Solution *" : t("testEditor.solutionFormula")}</FieldLabel>
      <Textarea
        className="min-h-0 resize-none overflow-hidden"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder="apple_number + 42"
        rows={2}
        value={formula}
      />
      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {getValidationLabel(validation.status)}
          </Badge>
          <CardDescription>
            {validation.sampleVariables
              ? `Sample variables: ${formatSampleVariables(validation.sampleVariables)}. ${validation.message}`
              : validation.message}
          </CardDescription>
        </div>
      )}
    </Field>
  );
}
