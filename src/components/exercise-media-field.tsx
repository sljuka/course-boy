import { ImagePlus, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ExerciseMediaDraft, TestExercise } from "@/components/test-editor-prototype-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MediaFrame } from "@/components/ui/media-frame";
import { matkoAssetUrl } from "@/lib/course-assets";
import { useUploadCourseAssetMutation } from "@/lib/course-queries";
import { type ExerciseMediaKind, supportsExerciseMedia } from "@/lib/exercise-media";
import type { Locale } from "@/lib/i18n";

// The optional image or video above an exercise's prompt (SLJ-56), in the
// test editor's exercise card and an inline exercise in a lesson. Added
// through the course's asset upload (same file types as lesson media); once
// there: a preview, Replace, Remove, "Decorative", and the alt text in the
// language being edited. Not offered on region exercises (their diagram is
// the exercise).
export function ExerciseMediaField({
  courseId,
  exercise,
  locale,
  onChange,
}: {
  courseId: string;
  exercise: TestExercise;
  locale: Locale;
  onChange: (updater: (exercise: TestExercise) => TestExercise) => void;
}) {
  const { t } = useTranslation();
  const uploadMutation = useUploadCourseAssetMutation();

  if (!supportsExerciseMedia(exercise.kind)) {
    return null;
  }

  const media = "media" in exercise ? exercise.media : undefined;

  function setMedia(update: (current: ExerciseMediaDraft | undefined) => ExerciseMediaDraft | undefined) {
    onChange((current) => ({ ...current, media: update("media" in current ? current.media : undefined) }) as TestExercise);
  }

  function upload(kind: ExerciseMediaKind) {
    uploadMutation.mutate(
      { courseId, kind },
      {
        onSuccess: (result) => {
          if (!result) return;
          // A replacement keeps the alt text and "Decorative": usually it's a
          // better version of the same picture.
          setMedia((current) => ({
            alt: current?.alt ?? {},
            assetFilename: result.path,
            decorative: current?.decorative ?? false,
            kind,
          }));
        },
      },
    );
  }

  const fieldId = `exercise-media-${exercise.id}`;

  if (!media) {
    return (
      <Field data-testid="exercise-media-field">
        <FieldTitle>{t("exerciseMedia.label")}</FieldTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="exercise-media-add-image"
            disabled={uploadMutation.isPending}
            onClick={() => upload("image")}
            size="sm"
            type="button"
            variant="secondary"
          >
            <ImagePlus aria-hidden="true" />
            {t("exerciseMedia.addImage")}
          </Button>
          <Button
            data-testid="exercise-media-add-video"
            disabled={uploadMutation.isPending}
            onClick={() => upload("video")}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Video aria-hidden="true" />
            {t("exerciseMedia.addVideo")}
          </Button>
        </div>
        <FieldDescription>{t("exerciseMedia.hint")}</FieldDescription>
      </Field>
    );
  }

  const url = matkoAssetUrl(courseId, media.assetFilename);

  return (
    <Field data-testid="exercise-media-field">
      <FieldTitle>{t(media.kind === "image" ? "exerciseMedia.imageLabel" : "exerciseMedia.videoLabel")}</FieldTitle>
      <div>
        <MediaFrame size={media.decorative ? "small" : "default"}>
          {media.kind === "image" ? (
            <img alt="" data-testid="exercise-media-preview" src={url} />
          ) : (
            <video controls controlsList="nodownload" data-testid="exercise-media-preview" preload="metadata" src={url} />
          )}
        </MediaFrame>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          data-testid="exercise-media-replace"
          disabled={uploadMutation.isPending}
          onClick={() => upload(media.kind)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {media.kind === "image" ? <ImagePlus aria-hidden="true" /> : <Video aria-hidden="true" />}
          {t("exerciseMedia.replace")}
        </Button>
        <Button
          data-testid="exercise-media-remove"
          onClick={() => setMedia(() => undefined)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
          {t("exerciseMedia.remove")}
        </Button>
      </div>
      <Field orientation="horizontal">
        <Checkbox
          checked={media.decorative}
          data-testid="exercise-media-decorative"
          id={`${fieldId}-decorative`}
          onCheckedChange={(checked) => setMedia((current) => current && { ...current, decorative: checked === true })}
        />
        <FieldContent>
          <FieldLabel htmlFor={`${fieldId}-decorative`}>{t("exerciseMedia.decorative")}</FieldLabel>
          <FieldDescription>{t("exerciseMedia.decorativeHint")}</FieldDescription>
        </FieldContent>
      </Field>
      {!media.decorative && (
        <Field>
          <FieldLabel htmlFor={`${fieldId}-alt-${locale}`}>
            {t(media.kind === "image" ? "exerciseMedia.altImage" : "exerciseMedia.altVideo")}
          </FieldLabel>
          <Input
            data-testid="exercise-media-alt"
            id={`${fieldId}-alt-${locale}`}
            onChange={(event) => {
              const value = event.target.value;
              setMedia((current) => current && { ...current, alt: { ...current.alt, [locale]: value } });
            }}
            value={media.alt[locale] ?? ""}
          />
          <FieldDescription>
            {t(media.kind === "image" ? "exerciseMedia.altImageHint" : "exerciseMedia.altVideoHint")}
          </FieldDescription>
        </Field>
      )}
    </Field>
  );
}
