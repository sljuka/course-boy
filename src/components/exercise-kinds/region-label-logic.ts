import type { SharedRegionLabelTestExerciseDefinition } from "@/lib/course-package";
import { pickUnusedLightColor } from "@/lib/color-options";
import type { Locale } from "@/lib/i18n";

import type {
  RegionLabelTestExercise,
  SolutionValidationResult,
} from "@/components/test-editor-prototype-types";
import { filterValidLocaleEntries } from "@/components/exercise-kinds/types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function createExerciseLocaleMap(locales: Locale[]) {
  return Object.fromEntries(
    locales.map((locale) => [locale, { hint: "", prompt: "" }]),
  );
}

export function createExercise(locales: Locale[]): RegionLabelTestExercise {
  return {
    kind: "region-label",
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    regions: [],
    svgAssetFilename: "",
    tagIds: [],
  };
}

export function updatePrompt(
  exercise: RegionLabelTestExercise,
  locale: Locale,
  prompt: string,
): RegionLabelTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? { hint: "", prompt: "" }), prompt },
    },
  };
}

export function updateHint(
  exercise: RegionLabelTestExercise,
  locale: Locale,
  hint: string,
): RegionLabelTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? { hint: "", prompt: "" }), hint },
    },
  };
}

// Replacing the diagram invalidates every previously marked region — same
// reasoning as region-marker's `setSvgAsset`.
export function setSvgAsset(
  exercise: RegionLabelTestExercise,
  svgAssetFilename: string,
): RegionLabelTestExercise {
  return { ...exercise, regions: [], svgAssetFilename };
}

export function clearSvgAsset(
  exercise: RegionLabelTestExercise,
): RegionLabelTestExercise {
  return { ...exercise, regions: [], svgAssetFilename: "", viewBox: undefined };
}

export function setViewBox(
  exercise: RegionLabelTestExercise,
  viewBox: string | undefined,
): RegionLabelTestExercise {
  return { ...exercise, viewBox };
}

/**
 * Clicking an unmarked shape appends it as the next region — array order
 * *is* the displayed sequence number, so this is the only place a number is
 * ever assigned. Clicking an already-marked shape removes it, closing the
 * gap automatically (the regions after it shift down a number for free,
 * since numbers are derived from position, never stored).
 */
export function toggleRegion(
  exercise: RegionLabelTestExercise,
  shapeId: string,
  locale: Locale,
): RegionLabelTestExercise {
  if (exercise.regions.some((region) => region.id === shapeId)) {
    return {
      ...exercise,
      regions: exercise.regions.filter((region) => region.id !== shapeId),
    };
  }

  return {
    ...exercise,
    regions: [
      ...exercise.regions,
      {
        color: pickUnusedLightColor(exercise.regions.map((region) => region.color)),
        id: shapeId,
        // Same convention as region-marker's label default: the shape id is
        // often already the country name (e.g. "Hungary"), so pre-filling
        // the answer saves retyping it — a generic id (e.g. "path2480")
        // just means the teacher replaces it, no worse than starting blank.
        answers: { [locale]: shapeId },
        matchCase: false,
      },
    ],
  };
}

export function removeRegion(
  exercise: RegionLabelTestExercise,
  regionId: string,
): RegionLabelTestExercise {
  return {
    ...exercise,
    regions: exercise.regions.filter((region) => region.id !== regionId),
  };
}

export function updateRegionAnswers(
  exercise: RegionLabelTestExercise,
  regionId: string,
  locale: Locale,
  answers: string,
): RegionLabelTestExercise {
  return {
    ...exercise,
    regions: exercise.regions.map((region) =>
      region.id === regionId
        ? { ...region, answers: { ...region.answers, [locale]: answers } }
        : region,
    ),
  };
}

export function updateRegionMatchCase(
  exercise: RegionLabelTestExercise,
  regionId: string,
  matchCase: boolean,
): RegionLabelTestExercise {
  return {
    ...exercise,
    regions: exercise.regions.map((region) =>
      region.id === regionId ? { ...region, matchCase } : region,
    ),
  };
}

// A region's number is drawn at its shape's bounding-box center by default,
// which can land outside the shape's own fill for a thin or concave region
// (e.g. Norway's northern sliver) — this lets the teacher drag it onto the
// visible part instead.
export function updateRegionLabelOffset(
  exercise: RegionLabelTestExercise,
  regionId: string,
  labelOffset: { dx: number; dy: number } | undefined,
): RegionLabelTestExercise {
  return {
    ...exercise,
    regions: exercise.regions.map((region) =>
      region.id === regionId ? { ...region, labelOffset } : region,
    ),
  };
}

function parseAnswers(raw: string): string[] {
  return raw
    .split(",")
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);
}

export function validate(
  exercise: RegionLabelTestExercise,
  locale: Locale,
): SolutionValidationResult {
  const content = exercise.locales[locale];

  if (!content) {
    return { status: "idle" };
  }

  if (!exercise.svgAssetFilename && content.prompt.trim().length === 0) {
    return { status: "idle" };
  }

  if (!exercise.svgAssetFilename) {
    return { message: "Choose a diagram", status: "error" };
  }

  if (content.prompt.trim().length === 0) {
    return { message: "Prompt is required", status: "error" };
  }

  if (exercise.regions.length === 0) {
    return { message: "Mark at least one region", status: "error" };
  }

  if (exercise.regions.some((region) => parseAnswers(region.answers[locale] ?? "").length === 0)) {
    return { message: "Every region needs at least one accepted answer", status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: RegionLabelTestExercise,
): SharedRegionLabelTestExerciseDefinition {
  return {
    kind: "region-label",
    locales: filterValidLocaleEntries(exercise.locales),
    regions: exercise.regions.map((region) => ({
      answers: filterValidLocaleEntries(
        Object.fromEntries(
          Object.entries(region.answers).map(([locale, raw]) => [locale, parseAnswers(raw)]),
        ),
      ),
      color: region.color,
      id: region.id,
      labelOffset: region.labelOffset,
      matchCase: region.matchCase,
    })),
    svgAssetFilename: exercise.svgAssetFilename,
    tags: exercise.tagIds,
    viewBox: exercise.viewBox,
  };
}

export function fromShared(
  definition: SharedRegionLabelTestExerciseDefinition,
): RegionLabelTestExercise {
  return {
    kind: "region-label",
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        { hint: content?.hint ?? "", prompt: content?.prompt ?? "" },
      ]),
    ),
    regions: definition.regions.map((region) => ({
      color: region.color,
      id: region.id,
      answers: Object.fromEntries(
        Object.entries(region.answers).map(([locale, answers]) => [
          locale,
          (answers ?? []).join(", "),
        ]),
      ),
      matchCase: region.matchCase,
      labelOffset: region.labelOffset,
    })),
    svgAssetFilename: definition.svgAssetFilename,
    tagIds: definition.tags,
    viewBox: definition.viewBox,
  };
}
