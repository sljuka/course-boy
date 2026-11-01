import { matkoAssetUrl } from "../course-assets";
import { resolveAssetFilename } from "../course-asset-id";
import type { FindInPictureCourseExercise, PictureArea, SharedFindInPictureTestExerciseDefinition } from "../course-package";
import type { ExerciseInstance } from "../course-player-utils";
import { isLocale } from "../i18n";

import { hasValidTags, partShare, type ExerciseKindRuntime, type GradeResult, type ResolveForPlayerContext, type ReviewPart } from "./types";

// Find in the picture (SLJ-179): the student taps the right area(s) on an
// ordinary picture. A tap on no area is a miss, marked where it landed.
// Right when exactly the correct areas are tapped and nothing else.

export const MAX_AREAS = 20;
// An area narrower than this share of the picture's width may be hard to tap
// on a small screen (the editor warns).
export const SMALL_AREA = 0.05;

const isFraction = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export function isValidPictureArea(area: unknown): area is PictureArea {
  if (!area || typeof area !== "object") return false;
  const { correct, height, id, shape, width, x, y } = area as Record<string, unknown>;
  return (
    typeof id === "string" &&
    id.length > 0 &&
    typeof correct === "boolean" &&
    (shape === "rect" || shape === "ellipse") &&
    [x, y, width, height].every(isFraction) &&
    (width as number) > 0 &&
    (height as number) > 0 &&
    (x as number) + (width as number) <= 1.0001 &&
    (y as number) + (height as number) <= 1.0001
  );
}

function isValid(exercise: Record<string, unknown>): exercise is SharedFindInPictureTestExerciseDefinition {
  if (!hasValidTags(exercise)) return false;
  if (typeof exercise.imageAssetFilename !== "string" || resolveAssetFilename(exercise.imageAssetFilename) === null) return false;
  const { areas } = exercise;
  if (!Array.isArray(areas) || areas.length === 0 || areas.length > MAX_AREAS || !areas.every(isValidPictureArea)) return false;
  if (new Set(areas.map((area) => area.id)).size !== areas.length) return false;
  if (!areas.some((area) => area.correct)) return false;
  if (!exercise.locales || typeof exercise.locales !== "object") return false;
  return Object.entries(exercise.locales as Record<string, unknown>).every(([locale, content]) => {
    if (!isLocale(locale) || !content || typeof content !== "object") return false;
    const { areaLabels, hint, imageAlt, prompt } = content as Record<string, unknown>;
    return (
      typeof prompt === "string" &&
      typeof imageAlt === "string" &&
      (hint === undefined || typeof hint === "string") &&
      (areaLabels === undefined ||
        (Array.isArray(areaLabels) && areaLabels.length === areas.length && areaLabels.every((label) => typeof label === "string")))
    );
  });
}

function resolveForPlayer(
  shared: SharedFindInPictureTestExerciseDefinition,
  context: ResolveForPlayerContext,
): FindInPictureCourseExercise {
  const content = context.requestedLocales.map((locale) => shared.locales[locale]).find((value) => value !== undefined);
  return {
    areaLabels: shared.areas.map((_area, index) => content?.areaLabels?.[index] ?? ""),
    areas: shared.areas,
    hint: context.hint,
    id: context.id,
    imageAlt: content?.imageAlt ?? "",
    imageUrl: matkoAssetUrl(context.courseId, shared.imageAssetFilename),
    kind: "find-in-picture",
    prompt: context.prompt,
    tags: shared.tags,
  };
}

function buildInstance(): ExerciseInstance {
  return { kind: "find-in-picture" };
}

// The answer: the areas tapped (by id), and where taps that hit no area
// landed (as fractions of the picture), so they can be shown and taken back.
// `points`: where each area was tapped, so a hit shows the same small ring as
// a miss and the area's outline isn't given away before the check.
export type FindInPictureAnswer = { areas: string[]; misses: [number, number][]; points?: Record<string, [number, number]> };

export function encodeFindInPictureAnswer(answer: FindInPictureAnswer): string {
  return JSON.stringify(answer);
}

export function decodeFindInPictureAnswer(raw: string, areas: PictureArea[]): FindInPictureAnswer {
  try {
    const parsed = JSON.parse(raw) as Partial<FindInPictureAnswer>;
    const ids = new Set(areas.map((area) => area.id));
    if (
      Array.isArray(parsed.areas) &&
      parsed.areas.every((id) => typeof id === "string" && ids.has(id)) &&
      Array.isArray(parsed.misses) &&
      parsed.misses.every((miss) => Array.isArray(miss) && miss.length === 2 && miss.every(isFraction))
    ) {
      const points =
        parsed.points && typeof parsed.points === "object"
          ? Object.fromEntries(
              Object.entries(parsed.points).filter(
                ([id, point]) => ids.has(id) && Array.isArray(point) && point.length === 2 && point.every(isFraction),
              ),
            )
          : {};
      return { areas: [...new Set(parsed.areas)], misses: parsed.misses, points };
    }
  } catch {
    // fall through to the empty default below
  }
  return { areas: [], misses: [] };
}

// The area a tap at (x, y) (fractions of the picture) is for: the one it's
// inside, else the nearest within `reach` (`reachX`/`reachY`: the forgiving
// distance as fractions of the picture's width and height), else none.
export function areaAt(areas: PictureArea[], x: number, y: number, reachX = 0, reachY = 0): PictureArea | null {
  let best: { area: PictureArea; distance: number } | null = null;
  for (const area of areas) {
    // Distance in "reach" units, so 1 is exactly the forgiving distance.
    const scaleX = reachX > 0 ? reachX : 1e-9;
    const scaleY = reachY > 0 ? reachY : 1e-9;
    let distance: number;
    if (area.shape === "ellipse") {
      const radiusX = area.width / 2;
      const radiusY = area.height / 2;
      const offsetX = x - (area.x + radiusX);
      const offsetY = y - (area.y + radiusY);
      const normalized = Math.hypot(offsetX / radiusX, offsetY / radiusY);
      if (normalized <= 1) return area;
      // The point's distance past the edge, along the line to the centre.
      const outside = 1 - 1 / normalized;
      distance = Math.hypot((offsetX * outside) / scaleX, (offsetY * outside) / scaleY);
    } else {
      const dx = Math.max(area.x - x, 0, x - (area.x + area.width));
      const dy = Math.max(area.y - y, 0, y - (area.y + area.height));
      if (dx === 0 && dy === 0) return area;
      distance = Math.hypot(dx / scaleX, dy / scaleY);
    }
    if (distance <= 1 && (!best || distance < best.distance)) best = { area, distance };
  }
  return best?.area ?? null;
}

function grade(exercise: FindInPictureCourseExercise, _instance: ExerciseInstance, rawAnswer: string): GradeResult {
  const answer = decodeFindInPictureAnswer(rawAnswer, exercise.areas);
  if (answer.areas.length === 0 && answer.misses.length === 0) {
    return { isAnswered: false, isCorrect: false, noAnswerMessageKey: "findInPicture.noAnswer" };
  }
  const correct = exercise.areas.filter((area) => area.correct).map((area) => area.id);
  const right = answer.areas.filter((id) => correct.includes(id)).length;
  const wrong = answer.areas.length - right + answer.misses.length;
  if (right === correct.length && wrong === 0) return { isCorrect: true };
  return { isAnswered: true, isCorrect: false, share: partShare(right, wrong, correct.length) };
}

// Each correct area, found or not, then each wrong tap.
function review(exercise: FindInPictureCourseExercise, _instance: ExerciseInstance, rawAnswer: string): ReviewPart[] {
  const answer = decodeFindInPictureAnswer(rawAnswer, exercise.areas);
  const name = (index: number) => exercise.areaLabels[index] || `${index + 1}`;
  return exercise.areas.flatMap((area, index): ReviewPart[] => {
    const tapped = answer.areas.includes(area.id);
    if (area.correct) return [{ answer: tapped ? name(index) : "", isCorrect: tapped, solution: name(index) }];
    return tapped ? [{ answer: name(index), isCorrect: false, solution: "" }] : [];
  });
}

export const findInPictureExerciseRuntime: ExerciseKindRuntime<
  SharedFindInPictureTestExerciseDefinition,
  FindInPictureCourseExercise
> = {
  buildInstance,
  grade,
  isValid,
  kind: "find-in-picture",
  resolveForPlayer,
  review,
};
