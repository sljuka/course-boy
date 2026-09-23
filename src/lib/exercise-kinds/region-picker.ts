import type {
  RegionPickerCourseExercise,
  SharedRegionPickerTestExerciseDefinition,
} from "../course-package";
import { matkoAssetUrl } from "../course-assets";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";

import {
  hasValidTags,
  type ExerciseKindRuntime,
  type GradeResult,
  type ResolveForPlayerContext,
} from "./types";

const VIEW_BOX_PATTERN = /^-?\d+(\.\d+)?(\s+-?\d+(\.\d+)?){3}$/;

// Strong Red, from `STRONG_COLOR_OPTIONS` (`src/lib/color-options.ts`) — the
// default for an exercise saved before `markerColor` existed, and for a
// freshly created one (see `region-picker-logic.ts`'s `createExercise`).
// Deliberately not `--primary` (this app's default theme accent is a
// brown/amber tone that reads poorly as a map highlight) and deliberately
// not a blue: most bundled/preset diagrams render water as a pale blue, so
// even a *bold* blue marker risks reading as "part of the ocean" at a
// glance — red has no such collision with typical map fills.
export const DEFAULT_REGION_PICKER_MARKER_COLOR = "#ef4444";

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedRegionPickerTestExerciseDefinition {
  if (!hasValidTags(exercise)) {
    return false;
  }

  if (
    typeof exercise.svgAssetFilename !== "string" ||
    exercise.svgAssetFilename.length === 0
  ) {
    return false;
  }

  if (
    typeof exercise.viewBox !== "undefined" &&
    (typeof exercise.viewBox !== "string" || !VIEW_BOX_PATTERN.test(exercise.viewBox))
  ) {
    return false;
  }

  if (
    typeof exercise.markerColor !== "undefined" &&
    (typeof exercise.markerColor !== "string" || exercise.markerColor.length === 0)
  ) {
    return false;
  }

  if (
    !Array.isArray(exercise.correctShapeIds) ||
    exercise.correctShapeIds.length === 0 ||
    !exercise.correctShapeIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return false;
  }

  return (
    !!exercise.locales &&
    typeof exercise.locales === "object" &&
    Object.entries(exercise.locales).every(([locale, metadata]) => {
      if (!isLocale(locale) || !metadata || typeof metadata !== "object") {
        return false;
      }

      const typedMetadata = metadata as { hint?: unknown; prompt?: unknown };

      return (
        typeof typedMetadata.prompt === "string" &&
        (typeof typedMetadata.hint === "undefined" || typeof typedMetadata.hint === "string")
      );
    })
  );
}

function resolveForPlayer(
  shared: SharedRegionPickerTestExerciseDefinition,
  context: ResolveForPlayerContext,
): RegionPickerCourseExercise {
  return {
    correctShapeIds: shared.correctShapeIds,
    hint: context.hint,
    id: context.id,
    kind: "region-picker",
    markerColor: shared.markerColor ?? DEFAULT_REGION_PICKER_MARKER_COLOR,
    prompt: context.prompt,
    svgAssetUrl: matkoAssetUrl(context.courseId, shared.svgAssetFilename),
    tags: shared.tags,
    viewBox: shared.viewBox,
  };
}

export function encodeRegionPickerSelection(selectedShapeIds: string[]): string {
  return JSON.stringify(selectedShapeIds);
}

export function decodeRegionPickerSelection(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
      return parsed;
    }
  } catch {
    // fall through to the empty default below
  }

  return [];
}

function buildInstance(): ExerciseInstance {
  return { kind: "region-picker" };
}

function grade(
  exercise: RegionPickerCourseExercise,
  _instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const selectedShapeIds = decodeRegionPickerSelection(rawAnswer);

  if (selectedShapeIds.length === 0) {
    return {
      isAnswered: false,
      isCorrect: false,
      noAnswerMessageKey: "courseDetails.selectAnAnswer",
    };
  }

  const correctSet = new Set(exercise.correctShapeIds);
  const selectedSet = new Set(selectedShapeIds);
  const isCorrect =
    correctSet.size === selectedSet.size &&
    [...correctSet].every((id) => selectedSet.has(id));

  if (isCorrect) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const regionPickerExerciseRuntime: ExerciseKindRuntime<
  SharedRegionPickerTestExerciseDefinition,
  RegionPickerCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "region-picker",
  resolveForPlayer,
};
