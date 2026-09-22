import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { MultipleChoiceTestExercise } from "@/components/test-editor-prototype-types";
import {
  addOption,
  removeOption,
  setSelectionMode,
  toggleCorrectOption,
  updateOptionText,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/multiple-choice-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";

const MIN_OPTIONS = 2;

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

export function MultipleChoiceExerciseFields({
  exercise,
  locale,
  onChange,
}: FieldsComponentProps<MultipleChoiceTestExercise>) {
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const options = exercise.locales[locale]?.options ?? [];
  const validation = validate(exercise, locale);

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>
          Prompt
        </FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updatePrompt(currentExercise, locale, event.target.value))
          }
          placeholder="What is the capital of France?"
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel>Options</FieldLabel>
        {exercise.selectionMode === "single" ? (
          <RadioGroup
            onValueChange={(value) =>
              onChange((currentExercise) => toggleCorrectOption(currentExercise, Number(value)))
            }
            value={String(exercise.correctOptionIndexes[0] ?? "")}
          >
            {options.map((optionText, optionIndex) => (
              <div className="flex items-center gap-2" key={optionIndex}>
                <RadioGroupItem
                  aria-label={`Mark option ${optionIndex + 1} as correct`}
                  value={String(optionIndex)}
                />
                <Input
                  onChange={(event) =>
                    onChange((currentExercise) =>
                      updateOptionText(currentExercise, locale, optionIndex, event.target.value),
                    )
                  }
                  placeholder={`Option ${optionIndex + 1}`}
                  value={optionText}
                />
                <button
                  aria-label={`Remove option ${optionIndex + 1}`}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  disabled={options.length <= MIN_OPTIONS}
                  onClick={() =>
                    onChange((currentExercise) => removeOption(currentExercise, optionIndex))
                  }
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="flex flex-col gap-2">
            {options.map((optionText, optionIndex) => (
              <div className="flex items-center gap-2" key={optionIndex}>
                <Checkbox
                  aria-label={`Mark option ${optionIndex + 1} as correct`}
                  checked={exercise.correctOptionIndexes.includes(optionIndex)}
                  onCheckedChange={() =>
                    onChange((currentExercise) => toggleCorrectOption(currentExercise, optionIndex))
                  }
                />
                <Input
                  onChange={(event) =>
                    onChange((currentExercise) =>
                      updateOptionText(currentExercise, locale, optionIndex, event.target.value),
                    )
                  }
                  placeholder={`Option ${optionIndex + 1}`}
                  value={optionText}
                />
                <button
                  aria-label={`Remove option ${optionIndex + 1}`}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  disabled={options.length <= MIN_OPTIONS}
                  onClick={() =>
                    onChange((currentExercise) => removeOption(currentExercise, optionIndex))
                  }
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={() => onChange((currentExercise) => addOption(currentExercise))}
          size="sm"
          variant="ghost"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add option
        </Button>
        <Label>
          <Checkbox
            checked={exercise.selectionMode === "single"}
            onCheckedChange={(checked) =>
              onChange((currentExercise) =>
                setSelectionMode(currentExercise, checked ? "single" : "multiple"),
              )
            }
          />
          Single answer (radio-button) selection
        </Label>
        {validation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.status === "valid" ? "success" : "warning"}>
              {getValidationLabel(validation.status)}
            </Badge>
            <CardDescription>{validation.message}</CardDescription>
          </div>
        )}
      </Field>
    </>
  );
}
