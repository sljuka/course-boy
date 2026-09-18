import type { SharedRegionPickerTestExerciseDefinition } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";

import type {
  RegionPickerTestExercise,
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

export function createExercise(locales: Locale[]): RegionPickerTestExercise {
  return {
    correctShapeIds: [],
    kind: "region-picker",
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    svgAssetFilename: "",
    tagIds: [],
  };
}

export function updatePrompt(
  exercise: RegionPickerTestExercise,
  locale: Locale,
  prompt: string,
): RegionPickerTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? { hint: "", prompt: "" }), prompt },
    },
  };
}

export function updateHint(
  exercise: RegionPickerTestExercise,
  locale: Locale,
  hint: string,
): RegionPickerTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? { hint: "", prompt: "" }), hint },
    },
  };
}

// Replacing the SVG invalidates any previously marked shape ids — the new
// file's shapes (if any share an id with the old one) are a coincidence, not
// a guarantee, so starting the correct-answer set over is the honest choice
// rather than silently carrying over ids that may no longer exist.
export function setSvgAsset(
  exercise: RegionPickerTestExercise,
  svgAssetFilename: string,
): RegionPickerTestExercise {
  return { ...exercise, correctShapeIds: [], svgAssetFilename };
}

export function toggleCorrectShape(
  exercise: RegionPickerTestExercise,
  shapeId: string,
): RegionPickerTestExercise {
  return {
    ...exercise,
    correctShapeIds: exercise.correctShapeIds.includes(shapeId)
      ? exercise.correctShapeIds.filter((id) => id !== shapeId)
      : [...exercise.correctShapeIds, shapeId],
  };
}

export function validate(
  exercise: RegionPickerTestExercise,
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
    return { message: "Upload an SVG", status: "error" };
  }

  if (content.prompt.trim().length === 0) {
    return { message: "Prompt is required", status: "error" };
  }

  if (exercise.correctShapeIds.length === 0) {
    return { message: "Click at least one region to mark it correct", status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: RegionPickerTestExercise,
): SharedRegionPickerTestExerciseDefinition {
  return {
    correctShapeIds: exercise.correctShapeIds,
    kind: "region-picker",
    locales: filterValidLocaleEntries(exercise.locales),
    svgAssetFilename: exercise.svgAssetFilename,
    tags: exercise.tagIds,
  };
}

export function fromShared(
  definition: SharedRegionPickerTestExerciseDefinition,
): RegionPickerTestExercise {
  return {
    correctShapeIds: definition.correctShapeIds,
    kind: "region-picker",
    id: createId("ex"),
    locales: Object.fromEntries(
      Object.entries(definition.locales).map(([locale, content]) => [
        locale,
        { hint: content?.hint ?? "", prompt: content?.prompt ?? "" },
      ]),
    ),
    svgAssetFilename: definition.svgAssetFilename,
    tagIds: definition.tags,
  };
}
