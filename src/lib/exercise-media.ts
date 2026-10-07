import { matkoAssetUrl } from "./course-assets";
import { resolveAssetFilename } from "./course-asset-id";
import type { CourseExercise, ExerciseKind } from "./course-package";
import type { Locale } from "./i18n";

// An optional image or video on an exercise (SLJ-56), shown above its prompt.
//
// On disk, on the exercise definition (a test's JSON and an inline exercise
// block in a lesson alike), following the conventions for assets and text:
//
//   media: { assetFilename, kind: "image" | "video", decorative? }
//   locales[locale].mediaAlt   the alt text, per language, next to prompt/hint
//
// Missing `media` means none. The asset is referenced by bare filename, so
// `getCourseAssetUsage` counts it like any other (docs/contracts.md §5), and
// `mediaAlt`, being inside `locales`, is generated in the other Serbian script
// with everything else there. Pure: used by the renderer and the main process.

export type ExerciseMediaKind = "image" | "video";

export type SharedExerciseMedia = {
  assetFilename: string;
  // Off unless the teacher ticks it: a decorative picture (a mascot, a mood
  // shot) is shown smaller, hidden from screen readers, and can be left out
  // of printouts. Media is otherwise part of the question.
  decorative?: boolean;
  kind: ExerciseMediaKind;
};

// The player's form: the asset's URL, and the alt text in the reader's language.
export type CourseExerciseMedia = {
  alt?: string;
  decorative: boolean;
  kind: ExerciseMediaKind;
  url: string;
};

// The region kinds' diagram is the exercise itself; a second picture would
// compete with it, so they have no media.
const KINDS_WITHOUT_MEDIA = new Set<ExerciseKind>(["region-label", "region-marker", "region-picker"]);

export function supportsExerciseMedia(kind: ExerciseKind): boolean {
  return !KINDS_WITHOUT_MEDIA.has(kind);
}

export function isValidSharedExerciseMedia(value: unknown): value is SharedExerciseMedia {
  if (!value || typeof value !== "object") {
    return false;
  }

  const media = value as Record<string, unknown>;

  return (
    typeof media.assetFilename === "string" &&
    resolveAssetFilename(media.assetFilename) !== null &&
    (media.kind === "image" || media.kind === "video") &&
    (media.decorative === undefined || typeof media.decorative === "boolean")
  );
}

// The media part of an exercise definition, checked on every read and save
// alongside the kind's own guard: `media` absent or well-formed, and every
// `mediaAlt` a string.
export function hasValidExerciseMedia(exercise: Record<string, unknown>): boolean {
  if (exercise.media !== undefined && !isValidSharedExerciseMedia(exercise.media)) {
    return false;
  }

  const locales = exercise.locales;

  if (!locales || typeof locales !== "object") {
    return true;
  }

  return Object.values(locales as Record<string, unknown>).every((content) => {
    const mediaAlt = (content as { mediaAlt?: unknown } | null)?.mediaAlt;

    return mediaAlt === undefined || typeof mediaAlt === "string";
  });
}

export function resolveExerciseMediaForPlayer(
  exercise: { locales: Partial<Record<Locale, { mediaAlt?: string }>>; media?: SharedExerciseMedia },
  requestedLocales: Locale[],
  courseId: string,
): CourseExerciseMedia | undefined {
  const { media } = exercise;

  if (!media) {
    return undefined;
  }

  const decorative = media.decorative ?? false;
  // The reader's language first, then the course's default; decorative media
  // has no alt text (screen readers skip it).
  const alt = decorative
    ? undefined
    : requestedLocales
        .map((locale) => exercise.locales[locale]?.mediaAlt?.trim())
        .find((value) => value && value.length > 0);

  return { alt, decorative, kind: media.kind, url: matkoAssetUrl(courseId, media.assetFilename) };
}

export function getExerciseMedia(exercise: CourseExercise): CourseExerciseMedia | undefined {
  return "media" in exercise ? exercise.media : undefined;
}
