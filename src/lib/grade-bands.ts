// Graded tests (SLJ-135): an exercise's points, a graded attempt's score as
// a percentage, and the grade bands that colour it.
//
// An exercise solved correctly in a graded test earns its points
// (`DEFAULT_EXERCISE_POINTS` unless the teacher set others; all or nothing).
// The score is the points earned out of all the points of the exercises the
// test gave, and its percentage (rounded) picks a band: the first band, from
// the highest, whose minimum it reaches; below the lowest it's grey.
//
// The bands are the course's (`CourseManifest.gradeBands`), or a test's own
// when the teacher set them for that test (`SharedTestDefinition.gradeBands`);
// missing on both, `DEFAULT_GRADE_BANDS`.

export const DEFAULT_EXERCISE_POINTS = 10;
export const MIN_EXERCISE_POINTS = 1;
export const MAX_EXERCISE_POINTS = 100;

export function isExercisePoints(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_EXERCISE_POINTS && (value as number) <= MAX_EXERCISE_POINTS;
}

export function exercisePoints(exercise: { points?: number }): number {
  return exercise.points ?? DEFAULT_EXERCISE_POINTS;
}

// The colours a band can have: tones of the design system, readable in light
// and dark mode (ui/grade-score.tsx). Gold also glows.
export const GRADE_BAND_COLORS = ["gold", "green", "yellow", "orange", "red", "purple", "blue", "grey"] as const;

export type GradeBandColor = (typeof GRADE_BAND_COLORS)[number];

// From `min` percent (a whole number, 0–100) up to the next band's minimum.
export type GradeBand = {
  color: GradeBandColor;
  min: number;
};

// Below the lowest band, unless the teacher chose another colour: a band
// from 0% (`splitGradeBands`).
export const BELOW_GRADE_BANDS_COLOR: GradeBandColor = "grey";

export const MAX_GRADE_BANDS = 8;

export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { color: "gold", min: 95 },
  { color: "green", min: 85 },
  { color: "yellow", min: 55 },
];

function isGradeBand(value: unknown): value is GradeBand {
  if (!value || typeof value !== "object") return false;
  const band = value as Partial<GradeBand>;

  return (
    GRADE_BAND_COLORS.includes(band.color as GradeBandColor) &&
    Number.isInteger(band.min) &&
    (band.min as number) >= 0 &&
    (band.min as number) <= 100
  );
}

// One to `MAX_GRADE_BANDS` bands, each with its own minimum.
export function isGradeBands(value: unknown): value is GradeBand[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_GRADE_BANDS) return false;
  if (!value.every(isGradeBand)) return false;

  return new Set(value.map((band) => band.min)).size === value.length;
}

// Highest minimum first, the order they're checked and shown in.
export function sortGradeBands(bands: GradeBand[]): GradeBand[] {
  return [...bands].sort((a, b) => b.min - a.min);
}

// The bands a test uses: its own, else the course's, else the defaults.
export function resolveGradeBands(
  testBands: GradeBand[] | null | undefined,
  courseBands: GradeBand[] | null | undefined,
): GradeBand[] {
  return sortGradeBands(testBands ?? courseBands ?? DEFAULT_GRADE_BANDS);
}

// Rounded to a whole percent: what's shown is what picks the band.
export function scorePercent(points: number, maxPoints: number): number {
  return maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
}

export function gradeBandColor(percent: number, bands: GradeBand[]): GradeBandColor {
  return sortGradeBands(bands).find((band) => percent >= band.min)?.color ?? BELOW_GRADE_BANDS_COLOR;
}

// The bands as the teacher edits them: those from 1% up, highest first, and
// the colour below the lowest of them (a band from 0%, else grey).
export function splitGradeBands(bands: GradeBand[]): { bands: GradeBand[]; belowColor: GradeBandColor } {
  const sorted = sortGradeBands(bands);

  return {
    bands: sorted.filter((band) => band.min > 0),
    belowColor: sorted.find((band) => band.min === 0)?.color ?? BELOW_GRADE_BANDS_COLOR,
  };
}

// Back from `splitGradeBands`: grey below needs no band of its own.
export function joinGradeBands(bands: GradeBand[], belowColor: GradeBandColor): GradeBand[] {
  return sortGradeBands([
    ...bands,
    ...(belowColor === BELOW_GRADE_BANDS_COLOR ? [] : [{ color: belowColor, min: 0 }]),
  ]);
}

// A short test makes one mistake a big share (1 of 2 is 50%): below this many
// questions, only a perfect run is celebrated.
export const MIN_QUESTIONS_FOR_CELEBRATION = 4;

// Whether a result earns the celebrated card border at the end of a test,
// and in which colour: the band it reaches, if that's one of the two highest
// (gold and green with the default bands), whatever colours the teacher
// chose. Null for anything lower, and for a short test that wasn't perfect.
export function celebrationColor(percent: number, bands: GradeBand[], questionCount: number): GradeBandColor | null {
  if (questionCount < MIN_QUESTIONS_FOR_CELEBRATION && percent < 100) return null;

  return splitGradeBands(bands).bands.slice(0, 2).find((band) => percent >= band.min)?.color ?? null;
}
