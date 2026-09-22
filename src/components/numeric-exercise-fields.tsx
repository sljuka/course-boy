import { useMemo, useState } from "react";
import { Plus, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
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
  NumericTestExercise,
  VariableConstraintType,
} from "@/components/test-editor-prototype-types";
import {
  addConstraintToVariable,
  extractPromptVariables,
  formatSampleVariables,
  getConstraintLabel,
  removeConstraintFromVariable,
  removeVariableFromExercise,
  syncExercisePrompt,
  validate,
} from "@/components/exercise-kinds/numeric-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";

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

export function NumericExerciseFields({
  exercise,
  locale,
  onChange,
}: FieldsComponentProps<NumericTestExercise>) {
  const [activeConstraintVariableId, setActiveConstraintVariableId] = useState<
    string | null
  >(null);
  const [constraintType, setConstraintType] =
    useState<VariableConstraintType>("min-value");
  const [constraintValue, setConstraintValue] = useState("5");
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const answerPlaceholder = exercise.locales[locale]?.answerPlaceholder ?? "";
  const usedVariableNames = useMemo(
    () => new Set(extractPromptVariables(prompt)),
    [prompt],
  );
  const solutionValidation = useMemo(
    () => validate(exercise, locale),
    [exercise, locale],
  );

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
            Prompt *
          </FieldLabel>
          <InfoTooltip>
            {
              "Use {{}} to make variables. For instance {{x}} for variable named x. Set constraints on it like minimal and maximal random value that can be assigned to it. Use it in the solution formula that will be used to calculate the answer."
            }
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
          placeholder="Mary had {{ apple_number }} apples..."
          rows={2}
          value={prompt}
        />
      </Field>

      {exercise.variables.length > 0 && (
        <Field>
          <FieldLabel>Variables</FieldLabel>
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
                          title="variable not used in prompt"
                        >
                          <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                        <button
                          aria-label={`Remove variable ${variable.name}`}
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
                      <span>{getConstraintLabel(constraint)}</span>
                      <button
                        aria-label={`Remove ${getConstraintLabel(constraint)}`}
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
                    New constraint
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="min-value">min-value</SelectItem>
                        <SelectItem value="max-value">max-value</SelectItem>
                        <SelectItem value="even-number">even-number</SelectItem>
                        <SelectItem value="odd-number">odd-number</SelectItem>
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
                      Add
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor={`exercise-solution-${exercise.id}`}>Solution *</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-solution-${exercise.id}`}
          onChange={(event) =>
            onChange((currentExercise) => ({
              ...currentExercise,
              solution: event.target.value,
            }))
          }
          placeholder="apple_number + 42"
          rows={2}
          value={exercise.solution}
        />
        {solutionValidation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={solutionValidation.status === "valid" ? "success" : "warning"}>
              {getValidationLabel(solutionValidation.status)}
            </Badge>
            <CardDescription>
              {solutionValidation.sampleVariables
                ? `Sample variables: ${formatSampleVariables(solutionValidation.sampleVariables)}. ${solutionValidation.message}`
                : solutionValidation.message}
            </CardDescription>
          </div>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor={`exercise-answer-placeholder-${exercise.id}-${locale}`}>
          Result input placeholder
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
          placeholder="Enter your result here"
          value={answerPlaceholder}
        />
      </Field>
    </>
  );
}
