import type {
  RegionLabelCourseExercise,
  SharedRegionLabelTestExerciseDefinition,
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

  const typedRegion = region as {
    answers?: unknown;
    color?: unknown;
    id?: unknown;
    matchCase?: unknown;
    labelOffset?: unknown;
  };

  if (
    typeof typedRegion.id !== "string" ||
    typedRegion.id.length === 0 ||
    typeof typedRegion.color !== "string" ||
    !HEX_COLOR_PATTERN.test(typedRegion.color) ||
    typeof typedRegion.matchCase !== "boolean"
  ) {
    return false;
  }

  if (typeof typedRegion.labelOffset !== "undefined") {
    const offset = typedRegion.labelOffset as { dx?: unknown; dy?: unknown };

    if (
      !offset ||
      typeof offset !== "object" ||
      typeof offset.dx !== "number" ||
      typeof offset.dy !== "number" ||
      !Number.isFinite(offset.dx) ||
      !Number.isFinite(offset.dy)
    ) {
      return false;
    }
  }

  return (
    !!typedRegion.answers &&
    typeof typedRegion.answers === "object" &&
    Object.entries(typedRegion.answers).every(
      ([locale, answers]) =>
        isLocale(locale) &&
        Array.isArray(answers) &&
        answers.length > 0 &&
        answers.every((answer) => typeof answer === "string" && answer.length > 0),
    )
  );
}

function isValid(
  exercise: Record<string, unknown>,
): exercise is SharedRegionLabelTestExerciseDefinition {
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
  shared: SharedRegionLabelTestExerciseDefinition,
  context: ResolveForPlayerContext,
): RegionLabelCourseExercise {
  return {
    hint: context.hint,
    id: context.id,
    kind: "region-label",
    prompt: context.prompt,
    regions: shared.regions.map((region) => ({
      answers:
        context.requestedLocales
          .map((locale) => region.answers[locale])
          .find((answersCandidate): answersCandidate is string[] => Array.isArray(answersCandidate)) ??
        [],
      color: region.color,
      id: region.id,
      labelOffset: region.labelOffset,
      matchCase: region.matchCase,
    })),
    svgAssetUrl: matkoAssetUrl(context.courseId, shared.svgAssetFilename),
    tags: shared.tags,
    viewBox: shared.viewBox,
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "region-label" };
}

// Position-based (array index = sequence number), not keyed by shape id —
// unlike region-marker, the student never clicks the diagram in this kind,
// they only type into a fixed, ordered list of inputs, so an index-aligned
// array is safe and simpler. Copied from `encodeMissingWordAnswers`/
// `decodeMissingWordAnswers` in `missing-word.ts`.
export function encodeRegionLabelAnswers(answers: string[]): string {
  return JSON.stringify(answers);
}

export function decodeRegionLabelAnswers(raw: string, regionCount: number): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (
      Array.isArray(parsed) &&
      parsed.length === regionCount &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed;
    }
  } catch {
    // fall through to the empty default below
  }

  return Array.from({ length: regionCount }, () => "");
}

function normalizeForComparison(value: string, matchCase: boolean): string {
  const trimmed = value.trim();

  return matchCase ? trimmed : trimmed.toLocaleLowerCase();
}

function grade(
  exercise: RegionLabelCourseExercise,
  _instance: ExerciseInstance,
  rawAnswer: string,
): GradeResult {
  const answers = decodeRegionLabelAnswers(rawAnswer, exercise.regions.length);

  if (answers.every((answer) => !answer.trim())) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "courseDetails.enterAnswer" };
  }

  const isFullyCorrect = exercise.regions.every((region, index) => {
    const typedAnswer = normalizeForComparison(answers[index] ?? "", region.matchCase);

    return region.answers.some(
      (accepted) => normalizeForComparison(accepted, region.matchCase) === typedAnswer,
    );
  });

  if (isFullyCorrect) {
    return { isCorrect: true };
  }

  return { isAnswered: true, isCorrect: false };
}

export const regionLabelExerciseRuntime: ExerciseKindRuntime<
  SharedRegionLabelTestExerciseDefinition,
  RegionLabelCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "region-label",
  resolveForPlayer,
};
