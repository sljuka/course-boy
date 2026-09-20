import type {
  RegionMarkerCourseExercise,
  SharedRegionMarkerTestExerciseDefinition,
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
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidRegion(region: unknown): boolean {
  if (!region || typeof region !== "object") {
    return false;
  }

  const typedRegion = region as { color?: unknown; id?: unknown; labels?: unknown };

  if (
    typeof typedRegion.id !== "string" ||
    typedRegion.id.length === 0 ||
    typeof typedRegion.color !== "string" ||
    !HEX_COLOR_PATTERN.test(typedRegion.color)
  ) {
    return false;
  }

  return (
    !!typedRegion.labels &&
    typeof typedRegion.labels === "object" &&
    Object.entries(typedRegion.labels).every(
      ([locale, label]) => isLocale(locale) && typeof label === "string",
    )
  );
}

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedRegionMarkerTestExerciseDefinition {
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

  if (!Array.isArray(exercise.regions) || exercise.regions.length === 0) {
    return false;
  }

  if (!exercise.regions.every(isValidRegion)) {
    return false;
  }

  const regionIds = exercise.regions.map((region) => (region as { id: string }).id);

  if (new Set(regionIds).size !== regionIds.length) {
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
  shared: SharedRegionMarkerTestExerciseDefinition,
  context: ResolveForPlayerContext,
): RegionMarkerCourseExercise {
  return {
    hint: context.hint,
    id: context.id,
    kind: "region-marker",
    prompt: context.prompt,
    regions: shared.regions.map((region) => ({
      color: region.color,
      id: region.id,
      label:
        context.requestedLocales
          .map((locale) => region.labels[locale])
          .find((labelCandidate) => typeof labelCandidate === "string") ?? "",
    })),
    svgAssetUrl: matkoAssetUrl(context.courseId, shared.svgAssetFilename),
    tags: shared.tags,
    viewBox: shared.viewBox,
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "region-marker" };
}

// Keyed by shape id, not position: the student can click any shape on the
// diagram (not just the teacher's designated regions — restricting clicks
// to a fixed subset made it impossible to tell which shapes were even
// interactive), so the answer has to be able to name any shape the student
// happened to color, not just an id from `exercise.regions`.
export function encodeRegionMarkerSelections(selections: Record<string, string>): string {
  return JSON.stringify(selections);
}

export function decodeRegionMarkerSelections(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every((value) => typeof value === "string")
    ) {
      return parsed as Record<string, string>;
    }
  } catch {
    // fall through to the empty default below
  }

  return {};
}

/**
 * Cycles a single shape's current color through every color actually used
 * in this exercise, then back to "unmarked" — the same "type1 -> type2 ->
 * ... -> none -> type1" cycle `cycleWordTypeSelection` uses for word types,
 * just keyed by shape id instead of marked-word index.
 */
export function cycleRegionMarkerColor(
  currentRaw: string,
  shapeId: string,
  usedColors: string[],
): string {
  const selections = decodeRegionMarkerSelections(currentRaw);
  const currentColor = selections[shapeId] ?? "";
  const currentColorIndex = usedColors.indexOf(currentColor);
  const nextColorIndex = currentColorIndex + 1;
  const nextColor = nextColorIndex < usedColors.length ? usedColors[nextColorIndex] : "";

  const nextSelections = { ...selections };

  if (nextColor) {
    nextSelections[shapeId] = nextColor;
  } else {
    delete nextSelections[shapeId];
  }

  return encodeRegionMarkerSelections(nextSelections);
}

function grade(
  exercise: RegionMarkerCourseExercise,
  _instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const selections = decodeRegionMarkerSelections(rawAnswer);
  const markedIds = Object.keys(selections);

  if (markedIds.length === 0) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.markAllRegions" };
  }

  // Exact match, same spirit as region-picker's grading: marking every
  // designated region with its own color isn't enough on its own — an extra
  // shape colored on the side (right color or not) makes the answer wrong
  // too, rather than being silently ignored.
  const isFullyCorrect =
    markedIds.length === exercise.regions.length &&
    exercise.regions.every((region) => selections[region.id] === region.color);

  if (isFullyCorrect) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const regionMarkerExerciseRuntime: ExerciseKindRuntime<
  SharedRegionMarkerTestExerciseDefinition,
  RegionMarkerCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "region-marker",
  resolveForPlayer,
};
