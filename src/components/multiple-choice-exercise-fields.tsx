import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { MultipleChoiceTestExercise } from "@/components/test-editor-prototype-types";
import {
  addOption,
  removeOption,
  setCorrectOption,
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
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const options = exercise.locales[locale]?.options ?? [];
  const validation = validate(exercise, locale);

  useEffect(() => {
    const textarea = promptRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [prompt]);

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
          ref={promptRef}
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel>Options</FieldLabel>
        <RadioGroup
          onValueChange={(value) =>
            onChange((currentExercise) => setCorrectOption(currentExercise, Number(value)))
          }
          value={String(exercise.correctOptionIndex)}
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
                className="inline-flex items-center text-stone-400 hover:text-stone-700 disabled:pointer-events-none disabled:opacity-40"
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
        <Button
          onClick={() => onChange((currentExercise) => addOption(currentExercise))}
          size="sm"
          variant="ghost"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add option
        </Button>
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
