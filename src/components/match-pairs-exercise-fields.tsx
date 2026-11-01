import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ExerciseMoreOptions, hasMoreOptionsSet } from "@/components/exercise-kinds/exercise-more-options";
import {
  addPair,
  MAX_PAIRS,
  MIN_PAIRS,
  type PairSide,
  removePair,
  setListenLeft,
  updateItemImage,
  updateItemText,
  updatePrompt,
  validate,
} from "@/components/exercise-kinds/match-pairs-logic";
import type { FieldsComponentProps } from "@/components/exercise-kinds/types";
import { ReadAloudButton } from "@/components/read-aloud-button";
import type { MatchPairsTestExercise } from "@/components/test-editor-prototype-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceCardImage } from "@/components/ui/choice-card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";

// The teacher's side of Match the pairs (SLJ-176): the instruction, then a
// row per pair, each side text or a picture (whose text says what it shows).
// "Heard, not shown" turns the left items into sounds, read in the
// exercise's read-aloud language.
export function MatchPairsExerciseFields({
  courseId,
  exercise,
  locale,
  moreOptions,
  onChange,
}: FieldsComponentProps<MatchPairsTestExercise>) {
  const { t } = useTranslation();
  const upload = useUploadCourseAssetMutation();
  const content = exercise.locales[locale] ?? { hint: "", left: [], prompt: "", right: [] };
  const validation = validate(exercise, locale);
  const fieldId = (name: string) => `match-pairs-${name}-${exercise.id}-${locale}`;
  const count = exercise.leftImages.length;

  function addPicture(side: PairSide, index: number) {
    upload.mutate(
      { courseId, kind: "image" },
      { onSuccess: (result) => result && onChange((current) => updateItemImage(current, side, index, result.path)) },
    );
  }

  function side(sideName: PairSide, index: number) {
    const image = (sideName === "left" ? exercise.leftImages : exercise.rightImages)[index];
    const text = content[sideName][index] ?? "";
    const isHeard = sideName === "left" && exercise.listenLeft;
    const name = t(sideName === "left" ? "matchPairs.leftItem" : "matchPairs.rightItem", { number: index + 1 });
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isHeard ? (
          <ReadAloudButton language={exercise.speech?.lang} text={text} />
        ) : image ? (
          <div className="size-12 shrink-0">
            <ChoiceCardImage alt={text} src={matkoAssetUrl(courseId, image)} />
          </div>
        ) : (
          <Button
            aria-label={t("matchPairs.addPicture", { item: name })}
            disabled={upload.isPending}
            onClick={() => addPicture(sideName, index)}
            shape="circle"
            size="icon"
            title={t("matchPairs.addPicture", { item: name })}
            type="button"
            variant="secondary"
          >
            <ImagePlus aria-hidden="true" />
          </Button>
        )}
        <Input
          aria-label={name}
          className="min-w-0"
          onChange={(event) => onChange((current) => updateItemText(current, locale, sideName, index, event.target.value))}
          placeholder={
            isHeard ? t("matchPairs.heardPlaceholder") : image ? t("listenChoose.optionAltPlaceholder") : t("matchPairs.textPlaceholder")
          }
          value={text}
        />
        {image && !isHeard && (
          <Button
            aria-label={t("listenChoose.removePicture")}
            onClick={() => onChange((current) => updateItemImage(current, sideName, index, null))}
            size="icon-sm"
            title={t("listenChoose.removePicture")}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>
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
          placeholder={t("matchPairs.promptPlaceholder")}
          rows={2}
          value={content.prompt}
        />
      </Field>

      <Field>
        <FieldLabel>{t("matchPairs.pairsLabel")}</FieldLabel>
        <FieldDescription>{t("matchPairs.pairsHelp")}</FieldDescription>
        <div className="flex flex-col gap-3">
          {Array.from({ length: count }, (_unused, index) => (
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap" data-testid="match-pairs-row" key={index}>
              {side("left", index)}
              {side("right", index)}
              <Button
                aria-label={t("matchPairs.removePair", { number: index + 1 })}
                disabled={count <= MIN_PAIRS}
                onClick={() => onChange((current) => removePair(current, index))}
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
          <Button
            disabled={count >= MAX_PAIRS}
            onClick={() => onChange((current) => addPair(current))}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" />
            {t("matchPairs.addPair")}
          </Button>
        </div>
        <Label>
          <Checkbox
            checked={exercise.listenLeft}
            data-testid="match-pairs-listen-left"
            onCheckedChange={(checked) => onChange((current) => setListenLeft(current, checked === true, locale))}
          />
          {t("matchPairs.listenLeft")}
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
