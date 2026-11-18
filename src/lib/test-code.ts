import { buildCourseExercisePool } from "@/lib/course-exercise-pool";
import type { CourseExercise, CourseTest } from "@/lib/course-package";
import { buildExerciseInstance, buildTestExerciseSequence, type ExerciseInstance } from "@/lib/course-player-utils";
import { createSeededRandom } from "@/lib/random";

// A test code (SLJ-232), like `K7QM-2XDP`, rebuilds one attempt of a test
// exactly: the same exercises, numbers and order. It's printed on a sheet
// and shown in the player, and can be typed in to get that attempt back.
//
// Eight characters of Crockford's base32 (no I, L, O or U, so nothing reads
// as another letter) hold 40 bits: a 30-bit seed for the attempt's draws,
// and a 10-bit fingerprint of the test's content, so a code made before the
// teacher changed the test is recognised instead of quietly giving a
// different one. Nothing is stored: the code is the whole attempt.

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;
const SEED_BITS = 30;
const FINGERPRINT_BITS = 10;
const SEED_LIMIT = 2 ** SEED_BITS;
const FINGERPRINT_LIMIT = 2 ** FINGERPRINT_BITS;

export type TestCode = { fingerprint: number; seed: number };

export type ParsedTestCode =
  | { status: "ok"; code: TestCode }
  | { status: "invalid" };

// A new attempt's seed: random, from the system's generator.
export function createTestSeed(): number {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value % SEED_LIMIT;
}

// `K7QM-2XDP`.
export function formatTestCode({ fingerprint, seed }: TestCode): string {
  let value = (seed % SEED_LIMIT) * FINGERPRINT_LIMIT + (fingerprint % FINGERPRINT_LIMIT);
  let characters = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    characters = ALPHABET[value % 32] + characters;
    value = Math.floor(value / 32);
  }

  return `${characters.slice(0, 4)}-${characters.slice(4)}`;
}

// Forgiving of how it's typed: any case, with or without the dash and
// spaces, and the letters Crockford's base32 reads as digits (I and L as 1,
// O as 0).
export function parseTestCode(text: string): ParsedTestCode {
  const characters = text
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");

  if (characters.length !== CODE_LENGTH) return { status: "invalid" };

  let value = 0;
  for (const character of characters) {
    const digit = ALPHABET.indexOf(character);
    if (digit < 0) return { status: "invalid" };
    value = value * 32 + digit;
  }

  return {
    code: { fingerprint: value % FINGERPRINT_LIMIT, seed: Math.floor(value / FINGERPRINT_LIMIT) },
    status: "ok",
  };
}

// Everything that decides what an attempt holds: the exercises and how
// they're picked (and a final test's pool, SLJ-136), without their text, so
// the same test in Serbian Latin, Cyrillic or English has the same
// fingerprint and a code works in each. No draw reads text: what decides one
// is which exercises there are, their tags, and numbers and counts (a
// variable's range, how many options or cards). Its keys are sorted, so the
// same test gives the same fingerprint whether it was read from disk or is
// the editor's preview.
export function fingerprintTest(test: CourseTest, courseTests: CourseTest[] = []): number {
  const content = stableStringify(
    withoutText({
      exerciseCount: test.exerciseCount ?? null,
      exercises: test.exercises,
      includeCourseExercises: test.includeCourseExercises,
      pool: test.includeCourseExercises ? buildCourseExercisePool(test, courseTests) : null,
      structure: test.structure ?? null,
    }),
  );

  return fnv1a(content) % FINGERPRINT_LIMIT;
}

// The strings that aren't in any language, so they stay in the fingerprint:
// which exercise and kind it is, its tags (the test's rules pick by them),
// and what decides the answers and draws (the formulas, a written
// calculation's operation and rule, single or multiple choice).
const KEPT_TEXT_KEYS = new Set([
  "formula",
  "id",
  "kind",
  "operation",
  "regrouping",
  "selectionMode",
  "tag",
  "tags",
  "testId",
]);

// Every other string becomes "", so a list of five options still counts five
// but reads the same in every language. Object keys stay: a numeric
// exercise's variable names are its keys.
function withoutText(value: unknown, key = ""): unknown {
  if (typeof value === "string") return KEPT_TEXT_KEYS.has(key) ? value : "";
  if (Array.isArray(value)) return value.map((item) => withoutText(item, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entry]) => [entryKey, withoutText(entry, entryKey)]),
    );
  }
  return value;
}

export type TestAttempt = {
  code: TestCode;
  exercises: CourseExercise[];
  instances: ExerciseInstance[];
};

// The attempt a seed gives: the exercises picked first, then each one's
// draws in order, all from one seeded source, so the same seed always gives
// the same attempt.
export function buildTestAttempt(test: CourseTest, courseTests: CourseTest[], seed: number): TestAttempt {
  const random = createSeededRandom(seed);
  const exercises = buildTestExerciseSequence({ test }, courseTests, random);
  const instances = exercises.map((exercise) => buildExerciseInstance(exercise, random));

  return { code: { fingerprint: fingerprintTest(test, courseTests), seed }, exercises, instances };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// FNV-1a, 32 bits: a quick, well-spread hash; not for secrets.
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
