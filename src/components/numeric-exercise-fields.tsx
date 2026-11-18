import { useMemo, useState } from "react";
import { Plus, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import { Field, FieldLabel } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  NumericSolutionSpace,
  NumericTestExercise,
  VariableConstraint,
  VariableConstraintType,
} from "@/components/test-editor-prototype-types";
import {
  addConstraintToVariable,
  extractPromptVariables,
  removeConstraintFromVariable,
  removeVariableFromExercise,
  syncExercisePrompt,
} from "@/components/exercise-kinds/numeric-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { NumericSolutionsField } from "@/components/numeric-solutions-field";

const SOLUTION_SPACES: NumericSolutionSpace[] = ["sm", "md", "lg", "xl"];

const CONSTRAINT_TYPES: VariableConstraintType[] = [
  "min-value",
  "max-value",
  "even-number",
  "odd-number",
];

export function NumericExerciseFields({
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<NumericTestExercise>) {
  const { t } = useTranslation();
  const [activeConstraintVariableId, setActiveConstraintVariableId] = useState<
    string | null
  >(null);
  const [constraintType, setConstraintType] =
    useState<VariableConstraintType>("min-value");
  const [constraintValue, setConstraintValue] = useState("5");
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const answerPlaceholder = exercise.locales[locale]?.answerPlaceholder ?? "";
  const hint = exercise.locales[locale]?.hint ?? "";
  const usedVariableNames = useMemo(
    () => new Set(extractPromptVariables(prompt)),
    [prompt],
  );

  // The kind in words; the id (`min-value`, …) is what's saved.
  function constraintLabel(constraint: VariableConstraint) {
    const kind = t(`numeric.constraint.${constraint.type}`);
    return constraint.value === null
      ? kind
      : t("numeric.constraintWithValue", { constraint: kind, value: constraint.value });
  }

  function submitConstraint(variableId: string) {
    const nextValue =
      constraintType === "min-value" || constraintType === "max-value"
        ? Number(constraintValue) || 0
        : null;

    onChange((currentExercise) =>
      addConstraintToVariable(currentExercise, variableId, constraintType, nextValue),
    );
    setActiveConstraintVariableId(null);
    setConstraintType("min-value");
    setConstraintValue("5");
  }

  return (
    <>
      <Field>
        <div className="flex items-center gap-1">
          <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>
            {t("numeric.promptLabel")}
          </FieldLabel>
          <InfoTooltip>
            {t("numeric.promptHelp", { braces: "{{}}", example: "{{x}}" })}
          </InfoTooltip>
        </div>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) =>
              syncExercisePrompt(currentExercise, locale, event.target.value),
            )
          }
          placeholder={t("numeric.promptPlaceholder", {
            variable: `{{ ${t("numeric.sampleVariable")} }}`,
          })}
          rows={2}
          value={prompt}
        />
      </Field>

      {exercise.variables.length > 0 && (
        <Field>
          <FieldLabel>{t("numeric.variablesLabel")}</FieldLabel>
          {exercise.variables.map((variable) => {
            const isUsed = usedVariableNames.has(variable.name);

            return (
              <div className="flex flex-col gap-2" key={variable.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isUsed ? "info" : "warning"}>
                    <span>{variable.name}</span>
                    {!isUsed && (
                      <>
                        <span
                          className="inline-flex items-center"
                          title={t("numeric.variableUnused")}
                        >
                          <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                        <button
                          aria-label={t("numeric.removeVariable", { name: variable.name })}
                          className="inline-flex items-center"
                          onClick={() =>
                            onChange((currentExercise) =>
                              removeVariableFromExercise(currentExercise, variable.id),
                            )
                          }
                          type="button"
                        >
                          <X aria-hidden="true" className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </Badge>
                  {variable.constraints.map((constraint) => (
                    <Badge className="gap-1.5 pr-1" key={constraint.id} variant="secondary">
                      <span>{constraintLabel(constraint)}</span>
                      <button
                        aria-label={t("numeric.removeConstraint", {
                          constraint: constraintLabel(constraint),
                        })}
                        className="inline-flex items-center"
                        onClick={() =>
                          onChange((currentExercise) =>
                            removeConstraintFromVariable(
                              currentExercise,
                              variable.id,
                              constraint.id,
                            ),
                          )
                        }
                        type="button"
                      >
                        <X aria-hidden="true" className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    onClick={() =>
                      setActiveConstraintVariableId((currentId) =>
                        currentId === variable.id ? null : variable.id,
                      )
                    }
                    size="sm"
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t("numeric.newConstraint")}
                  </Button>
                </div>

                {activeConstraintVariableId === variable.id && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      onValueChange={(value) =>
                        setConstraintType(value as VariableConstraintType)
                      }
                      value={constraintType}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue>
                          {(value: VariableConstraintType) => t(`numeric.constraint.${value}`)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CONSTRAINT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`numeric.constraint.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(constraintType === "min-value" || constraintType === "max-value") && (
                      <Input
                        className="w-full sm:w-32"
                        onChange={(event) => setConstraintValue(event.target.value)}
                        type="number"
                        value={constraintValue}
                      />
                    )}
                    <Button onClick={() => submitConstraint(variable.id)} size="sm" variant="secondary">
                      {t("numeric.addConstraint")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Field>
      )}

      <NumericSolutionsField exercise={exercise} locale={locale} onChange={onChange} />

      <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>
          <Field>
            <FieldLabel htmlFor={`exercise-answer-placeholder-${exercise.id}-${locale}`}>
              {t("numeric.answerPlaceholderLabel")}
            </FieldLabel>
            <Input
              id={`exercise-answer-placeholder-${exercise.id}-${locale}`}
              onChange={(event) =>
                onChange((currentExercise) => ({
                  ...currentExercise,
                  locales: {
                    ...currentExercise.locales,
                    [locale]: {
                      ...(currentExercise.locales[locale] ?? {
                        answerPlaceholder: "",
                        hint: "",
                        prompt: "",
                      }),
                      answerPlaceholder: event.target.value,
                    },
                  },
                }))
              }
              placeholder={t("numeric.answerPlaceholderPlaceholder")}
              value={answerPlaceholder}
            />
          </Field>

          <Field>
            <div className="flex items-center gap-1">
              <FieldLabel htmlFor={`exercise-solution-space-${exercise.id}`}>
                {t("numeric.spaceLabel")}
              </FieldLabel>
              <InfoTooltip>{t("numeric.spaceHelp")}</InfoTooltip>
            </div>
            <Select
              onValueChange={(value) =>
                onChange((currentExercise) => ({
                  ...currentExercise,
                  solutionSpace: value as NumericSolutionSpace,
                }))
              }
              value={exercise.solutionSpace}
            >
              <SelectTrigger className="w-full sm:w-64" id={`exercise-solution-space-${exercise.id}`}>
                <SelectValue>
                  {(value: NumericSolutionSpace) => t(`numeric.space.${value}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SOLUTION_SPACES.map((space) => (
                  <SelectItem key={space} value={space}>
                    {t(`numeric.space.${space}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <div className="flex items-center gap-1">
              <FieldLabel htmlFor={`exercise-hint-${exercise.id}-${locale}`}>
                {t("numeric.hintLabel")}
              </FieldLabel>
              <InfoTooltip>{t("numeric.hintHelp")}</InfoTooltip>
            </div>
            <Textarea
              className="min-h-0 resize-none overflow-hidden"
              id={`exercise-hint-${exercise.id}-${locale}`}
              onChange={(event) =>
                onChange((currentExercise) => ({
                  ...currentExercise,
                  locales: {
                    ...currentExercise.locales,
                    [locale]: {
                      ...(currentExercise.locales[locale] ?? {
                        answerPlaceholder: "",
                        hint: "",
                        prompt: "",
                      }),
                      hint: event.target.value,
                    },
                  },
                }))
              }
              placeholder={t("numeric.hintPlaceholder")}
              rows={2}
              value={hint}
            />
          </Field>
          {moreOptions}
      </ExerciseMoreOptions>
    </>
  );
}
