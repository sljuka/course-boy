import { useEffect, useMemo, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WordMarker } from "@/components/ui/word-marker";
import { MissingWordText } from "@/components/missing-word-tokens";
import type { MissingWordTestExercise } from "@/components/test-editor-prototype-types";
import {
  updatePrompt,
  updateText,
  updateVariableAnswers,
  updateVariableMatchCase,
  validate,
} from "@/components/exercise-kinds/missing-word-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { parseMissingWordMarkup } from "@/lib/missing-word-markup";

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

export function MissingWordExerciseFields({
  exercise,
  locale,
  onChange,
}: FieldsComponentProps<MissingWordTestExercise>) {
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const content = exercise.locales[locale];
  const prompt = content?.prompt ?? "";
  const text = content?.text ?? "";
  const variables = content?.variables ?? [];
  const validation = validate(exercise, locale);

  const previewSegments = useMemo(() => parseMissingWordMarkup(text), [text]);
  const variablesByName = new Map(variables.map((variable) => [variable.name, variable]));

  useEffect(() => {
    const textarea = promptRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [prompt]);

  useEffect(() => {
    const textarea = textRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

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
          placeholder="Fill in the missing words"
          ref={promptRef}
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`exercise-text-${exercise.id}-${locale}`}>Text</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-text-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updateText(currentExercise, locale, event.target.value))
          }
          placeholder="The capital of France is {{c1}}. Capital of Serbia is {{c2}}."
          ref={textRef}
          rows={2}
          value={text}
        />
      </Field>

      {variables.length > 0 && (
        <Field>
          <FieldLabel>Missing words</FieldLabel>
          <div className="flex flex-col gap-2">
            {variables.map((variable) => (
              <div className="flex flex-wrap items-center gap-2" key={variable.name}>
                <Badge variant="secondary">{`{{${variable.name}}}`}</Badge>
                <Input
                  aria-label={`Answer for {{${variable.name}}}`}
                  className="min-w-40 flex-1"
                  onChange={(event) =>
                    onChange((currentExercise) =>
                      updateVariableAnswers(currentExercise, locale, variable.name, event.target.value),
                    )
                  }
                  placeholder="Paris, or Solution1, Solution2"
                  value={variable.answers}
                />
                <Label>
                  <Checkbox
                    checked={variable.matchCase}
                    onCheckedChange={(checked) =>
                      onChange((currentExercise) =>
                        updateVariableMatchCase(currentExercise, locale, variable.name, checked),
                      )
                    }
                  />
                  Match case
                </Label>
              </div>
            ))}
          </div>
        </Field>
      )}

      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {getValidationLabel(validation.status)}
          </Badge>
          <CardDescription>{validation.message}</CardDescription>
        </div>
      )}

      {previewSegments.some((segment) => segment.kind === "blank") && (
        <Card className="overflow-visible p-3">
          <MissingWordText
            renderBlank={(_blankIndex, variableName) => {
              const variable = variablesByName.get(variableName);
              const firstAnswer = variable?.answers.split(",")[0]?.trim();

              return <WordMarker marked>{firstAnswer || variableName}</WordMarker>;
            }}
            segments={previewSegments}
          />
        </Card>
      )}
    </>
  );
}
