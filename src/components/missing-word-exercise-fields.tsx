import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
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

export function MissingWordExerciseFields({
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<MissingWordTestExercise>) {
  const { t } = useTranslation();
  const content = exercise.locales[locale];
  const prompt = content?.prompt ?? "";
  const text = content?.text ?? "";
  const variables = content?.variables ?? [];
  const validation = validate(exercise, locale);

  const previewSegments = useMemo(() => parseMissingWordMarkup(text), [text]);
  const variablesByName = new Map(variables.map((variable) => [variable.name, variable]));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`exercise-prompt-${exercise.id}-${locale}`}>
          {t("missingWordEditor.promptLabel")}
        </FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-prompt-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updatePrompt(currentExercise, locale, event.target.value))
          }
          placeholder={t("missingWordEditor.promptPlaceholder")}
          rows={2}
          value={prompt}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`exercise-text-${exercise.id}-${locale}`}>{t("missingWordEditor.textLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={`exercise-text-${exercise.id}-${locale}`}
          onChange={(event) =>
            onChange((currentExercise) => updateText(currentExercise, locale, event.target.value))
          }
          // The blanks are the exercise's own syntax, passed as values so i18next shows them as typed.
          placeholder={t("missingWordEditor.textPlaceholder", { first: "{{c1}}", second: "{{c2}}" })}
          rows={2}
          value={text}
        />
      </Field>

      {variables.length > 0 && (
        <Field>
          <FieldLabel>{t("missingWordEditor.missingWordsLabel")}</FieldLabel>
          <div className="flex flex-col gap-2">
            {variables.map((variable) => (
              <div className="flex flex-wrap items-center gap-2" key={variable.name}>
                <Badge variant="secondary">{`{{${variable.name}}}`}</Badge>
                <Input
                  aria-label={t("missingWordEditor.answerFor", { blank: `{{${variable.name}}}` })}
                  className="min-w-40 flex-1"
                  onChange={(event) =>
                    onChange((currentExercise) =>
                      updateVariableAnswers(currentExercise, locale, variable.name, event.target.value),
                    )
                  }
                  placeholder={t("missingWordEditor.answersPlaceholder")}
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
                  {t("missingWordEditor.matchCase")}
                </Label>
              </div>
            ))}
          </div>
        </Field>
      )}

      {validation.status !== "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validation.status === "valid" ? "success" : "warning"}>
            {t(`missingWordEditor.validation.${validation.status}`)}
          </Badge>
          <CardDescription>{t(validation.message.key, validation.message.values)}</CardDescription>
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
      {moreOptions && (
        <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>
      )}
    </>
  );
}
