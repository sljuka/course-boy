import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import {
  addOption,
  removeOption,
  setSelectionMode,
  toggleCorrectOption,
  updateOptionImage,
  updateOptionText,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/listen-choose-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { ReadAloudButton } from "@/components/read-aloud-button";
import type { ListenChooseTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceCardImage } from "@/components/ui/choice-card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";
import { SPEECH_LANGUAGES, type SpeechLanguage } from "@/lib/exercise-speech";

const MIN_OPTIONS = 2;

// The teacher's side of Listen and choose (SLJ-175): the instruction, what the
// student hears and in which language (with a 🔊 to try it), and the options:
// a picture each, or text, one or several marked right.
export function ListenChooseExerciseFields({
  courseId,
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<ListenChooseTestExercise>) {
  const { t } = useTranslation();
  const upload = useUploadCourseAssetMutation();
  const content = exercise.locales[locale] ?? { hint: "", options: ["", ""], prompt: "" };
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `listen-choose-${name}-${exercise.id}-${locale}`;
  const language = exercise.speech?.lang;

  function addPicture(optionIndex: number) {
    upload.mutate(
      { courseId, kind: "image" },
      { onSuccess: (result) => result && onChange((current) => updateOptionImage(current, optionIndex, result.path)) },
    );
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor={fieldId("prompt")}>{t("listenChoose.promptLabel")}</FieldLabel>
        <Textarea
          className="min-h-0 resize-none overflow-hidden"
          id={fieldId("prompt")}
          onChange={(event) => onChange((current) => updatePrompt(current, locale, event.target.value))}
          placeholder={t("listenChoose.promptPlaceholder")}
          rows={2}
          value={content.prompt}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("spoken")}>{t("listenChoose.spokenLabel")}</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-48 flex-1"
            data-testid="listen-choose-spoken"
            id={fieldId("spoken")}
            onChange={(event) => onChange((current) => ({ ...current, spoken: event.target.value }))}
            placeholder={t("listenChoose.spokenPlaceholder")}
            value={exercise.spoken}
          />
          <Select
            onValueChange={(value) => value && onChange((current) => ({ ...current, speech: { lang: value as SpeechLanguage } }))}
            value={language ?? null}
          >
            <SelectTrigger aria-label={t("listenChoose.languageLabel")} className="w-40">
              <SelectValue placeholder={t("listenChoose.languageLabel")}>
                {(value: string) => t(`readAloud.languages.${value}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SPEECH_LANGUAGES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`readAloud.languages.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ReadAloudButton language={language} text={exercise.spoken} />
        </div>
        <FieldDescription>{t("listenChoose.spokenHelp")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>{t("listenChoose.optionsLabel")}</FieldLabel>
        <FieldDescription>{t("listenChoose.optionsHelp")}</FieldDescription>
        <div className="flex flex-col gap-3">
          {content.options.map((text, optionIndex) => {
            const image = exercise.optionImages[optionIndex];
            return (
              <div className="flex items-center gap-2" data-testid="listen-choose-option-row" key={optionIndex}>
                <Checkbox
                  aria-label={t("listenChoose.markCorrect", { number: optionIndex + 1 })}
                  checked={exercise.correctOptionIndexes.includes(optionIndex)}
                  onCheckedChange={() => onChange((current) => toggleCorrectOption(current, optionIndex))}
                />
                {image ? (
                  <div className="size-14 shrink-0">
                    <ChoiceCardImage alt={text} src={matkoAssetUrl(courseId, image)} />
                  </div>
                ) : (
                  <Button
                    aria-label={t("listenChoose.addPicture")}
                    disabled={upload.isPending}
                    onClick={() => addPicture(optionIndex)}
                    shape="circle"
                    size="icon"
                    title={t("listenChoose.addPicture")}
                    type="button"
                    variant="secondary"
                  >
                    <ImagePlus aria-hidden="true" />
                  </Button>
                )}
                <Input
                  aria-label={t("listenChoose.optionText", { number: optionIndex + 1 })}
                  onChange={(event) => onChange((current) => updateOptionText(current, locale, optionIndex, event.target.value))}
                  placeholder={image ? t("listenChoose.optionAltPlaceholder") : t("listenChoose.optionTextPlaceholder")}
                  value={text}
                />
                {image && (
                  <Button
                    aria-label={t("listenChoose.removePicture")}
                    onClick={() => onChange((current) => updateOptionImage(current, optionIndex, null))}
                    size="icon-sm"
                    title={t("listenChoose.removePicture")}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
                <Button
                  aria-label={t("listenChoose.removeOption", { number: optionIndex + 1 })}
                  disabled={content.options.length <= MIN_OPTIONS}
                  onClick={() => onChange((current) => removeOption(current, optionIndex))}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
        <div>
          <Button onClick={() => onChange((current) => addOption(current))} size="sm" type="button" variant="secondary">
            <Plus aria-hidden="true" />
            {t("listenChoose.addOption")}
          </Button>
        </div>
        <Label>
          <Checkbox
            checked={exercise.selectionMode === "multiple"}
            onCheckedChange={(checked) => onChange((current) => setSelectionMode(current, checked ? "multiple" : "single"))}
          />
          {t("listenChoose.severalRight")}
        </Label>
        {validation.status !== "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.status === "valid" ? "success" : "warning"}>
              {t(validation.status === "valid" ? "listenChoose.valid" : "listenChoose.invalid")}
            </Badge>
            <CardDescription>{validation.message}</CardDescription>
          </div>
        )}
      </Field>
      {moreOptions && <ExerciseMoreOptions defaultOpen={hasMoreOptionsSet(exercise)}>{moreOptions}</ExerciseMoreOptions>}
    </>
  );
}
