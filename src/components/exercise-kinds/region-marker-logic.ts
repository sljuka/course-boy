import type { SharedRegionMarkerTestExerciseDefinition } from "@/lib/course-package";
import { LIGHT_COLOR_OPTIONS } from "@/lib/color-options";
import type { Locale } from "@/lib/i18n";

import type {
  RegionMarkerTestExercise,
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

// Grey ("Stone") is excluded from the pool entirely: most diagrams a teacher
// picks (e.g. the bundled Europe map) already render their regions in light
// grey by default, so a region assigned this color would look unmarked even
// once correctly colored.
const REGION_MARKER_COLOR_POOL = LIGHT_COLOR_OPTIONS.filter(
  (option) => option.name !== "Stone",
);

// Prefers a color not already used by another region in this exercise, so
// the legend stays unambiguous (two regions sharing a color would show two
// identically-colored tags with different labels) — falls back to a fully
// random pick once every color in the pool is already in use.
function pickRegionColor(usedColors: string[]): string {
  const used = new Set(usedColors);
  const unused = REGION_MARKER_COLOR_POOL.filter((option) => !used.has(option.hex));
  const pool = unused.length > 0 ? unused : REGION_MARKER_COLOR_POOL;

  return pool[Math.floor(Math.random() * pool.length)].hex;
}

export function createExercise(locales: Locale[]): RegionMarkerTestExercise {
  return {
    kind: "region-marker",
    id: createId("ex"),
    locales: createExerciseLocaleMap(locales),
    regions: [],
    svgAssetFilename: "",
    tagIds: [],
  };
}

export function updatePrompt(
  exercise: RegionMarkerTestExercise,
  locale: Locale,
  prompt: string,
): RegionMarkerTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? { hint: "", prompt: "" }), prompt },
    },
  };
}

export function updateHint(
  exercise: RegionMarkerTestExercise,
  locale: Locale,
  hint: string,
): RegionMarkerTestExercise {
  return {
    ...exercise,
    locales: {
      ...exercise.locales,
      [locale]: { ...(exercise.locales[locale] ?? { hint: "", prompt: "" }), hint },
    },
  };
}

// Replacing the diagram invalidates every previously marked region — a
// shape id that happens to also exist in the new file is a coincidence, not
// a guarantee, same reasoning as region-picker's `setSvgAsset`.
export function setSvgAsset(
  exercise: RegionMarkerTestExercise,
  svgAssetFilename: string,
): RegionMarkerTestExercise {
  return { ...exercise, regions: [], svgAssetFilename };
}

export function clearSvgAsset(
  exercise: RegionMarkerTestExercise,
): RegionMarkerTestExercise {
  return { ...exercise, regions: [], svgAssetFilename: "", viewBox: undefined };
}

export function setViewBox(
  exercise: RegionMarkerTestExercise,
  viewBox: string | undefined,
): RegionMarkerTestExercise {
  return { ...exercise, viewBox };
}

/** Clicking an unmarked shape adds it as a new region; clicking an already-marked one removes it. */
export function toggleRegion(
  exercise: RegionMarkerTestExercise,
  shapeId: string,
  locale: Locale,
): RegionMarkerTestExercise {
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
        color: pickRegionColor(exercise.regions.map((region) => region.color)),
        id: shapeId,
        // Defaults to the shape's own id — often already the right label
        // (e.g. a country name) — rather than making the teacher retype
        // what the map already told them. Still just a starting value: the
        // label input right below is editable like any other field.
        labels: { [locale]: shapeId },
      },
    ],
  };
}

export function removeRegion(
  exercise: RegionMarkerTestExercise,
  regionId: string,
): RegionMarkerTestExercise {
  return {
    ...exercise,
    regions: exercise.regions.filter((region) => region.id !== regionId),
  };
}

export function updateRegionLabel(
  exercise: RegionMarkerTestExercise,
  regionId: string,
  locale: Locale,
  label: string,
): RegionMarkerTestExercise {
  return {
    ...exercise,
    regions: exercise.regions.map((region) =>
      region.id === regionId
        ? { ...region, labels: { ...region.labels, [locale]: label } }
        : region,
    ),
  };
}

export function validate(
  exercise: RegionMarkerTestExercise,
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

  if (exercise.regions.some((region) => !(region.labels[locale] ?? "").trim())) {
    return { message: "Every region needs a label", status: "error" };
  }

  return { message: "Looks good", status: "valid" };
}

export function toShared(
  exercise: RegionMarkerTestExercise,
): SharedRegionMarkerTestExerciseDefinition {
  return {
    kind: "region-marker",
    locales: filterValidLocaleEntries(exercise.locales),
    regions: exercise.regions.map((region) => ({
      color: region.color,
      id: region.id,
      labels: filterValidLocaleEntries(region.labels),
    })),
    svgAssetFilename: exercise.svgAssetFilename,
    tags: exercise.tagIds,
    viewBox: exercise.viewBox,
  };
}

export function fromShared(
  definition: SharedRegionMarkerTestExerciseDefinition,
): RegionMarkerTestExercise {
  return {
    kind: "region-marker",
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
      labels: Object.fromEntries(
        Object.entries(region.labels).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    })),
    svgAssetFilename: definition.svgAssetFilename,
    tagIds: definition.tags,
    viewBox: definition.viewBox,
  };
}
