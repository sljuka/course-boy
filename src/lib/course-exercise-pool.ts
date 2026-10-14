import type { CourseExercise, CourseSectionPreview, CourseTest } from "@/lib/course-package";

// Final tests (SLJ-136): a test that includes the exercises of the course's
// other tests. Its pool is a source per test, in course order (each
// section's lesson tests, then its own tests), the final test's own
// exercises among them. Tests that include other tests' exercises themselves
// are left out, so no test pulls from another such test in a loop. Each
// exercise keeps its id (`<testId>#<n>`, unique in the course) and points.

export const MAX_EXERCISE_COUNT = 500;

// Without a count, a final test over this many exercises is long enough for
// the editor to say so.
export const LONG_TEST_EXERCISE_COUNT = 20;

export function isExerciseCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_EXERCISE_COUNT;
}

export type ExerciseSource = {
  exercises: CourseExercise[];
  testId: string;
};

// Every test in the course, in course order.
export function listCourseTests(sections: Pick<CourseSectionPreview, "lessons" | "tests">[]): CourseTest[] {
  return sections.flatMap((section) => [
    ...section.lessons.flatMap((lesson) => (lesson.test ? [lesson.test] : [])),
    ...section.tests.flatMap((sectionTest) => (sectionTest.test ? [sectionTest.test] : [])),
  ]);
}

// The final test's pool. `finalTest` stands in for its own entry in
// `courseTests` (a teacher's preview shows the test being edited, not the
// saved one); a test not in the course yet comes last.
export function buildCourseExercisePool(finalTest: CourseTest, courseTests: CourseTest[]): ExerciseSource[] {
  const tests = courseTests.some((test) => test.id === finalTest.id) ? courseTests : [...courseTests, finalTest];

  return tests
    .flatMap((test) => {
      if (test.id === finalTest.id) return [finalTest];
      return test.includeCourseExercises ? [] : [test];
    })
    .map((test) => ({ exercises: test.exercises, testId: test.id }))
    .filter((source) => source.exercises.length > 0);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }

  return shuffled;
}

// `count` exercises taken in turn from each source, shuffled within it: one
// from each test before a second from any, so every test is represented. A
// source that runs out is skipped; the turn starts at a random source, so
// when the count doesn't divide evenly the extra ones fall on different
// tests each time. The picked exercises keep their sources' order.
export function pickRoundRobin(
  sources: ExerciseSource[],
  count: number,
  random: () => number = Math.random,
): CourseExercise[] {
  const shuffled = sources.map((source) => shuffle(source.exercises, random));
  const taken = shuffled.map(() => 0);
  const available = shuffled.reduce((sum, exercises) => sum + exercises.length, 0);
  let remaining = Math.min(count, available);
  let turn = Math.floor(random() * shuffled.length);

  while (remaining > 0) {
    if (taken[turn] < shuffled[turn].length) {
      taken[turn] += 1;
      remaining -= 1;
    }
    turn = (turn + 1) % shuffled.length;
  }

  return shuffled.flatMap((exercises, index) => exercises.slice(0, taken[index]));
}

// How big a final test's pool is, for the editor: the course's other tests
// (as saved) and the test's own exercises (as being edited).
export function summarizeCourseExercisePool(
  testId: string,
  ownExerciseCount: number,
  courseTests: CourseTest[],
): { exercises: number; tests: number } {
  const others = courseTests.filter(
    (test) => test.id !== testId && !test.includeCourseExercises && test.exercises.length > 0,
  );

  return {
    exercises: ownExerciseCount + others.reduce((sum, test) => sum + test.exercises.length, 0),
    tests: others.length + (ownExerciseCount > 0 ? 1 : 0),
  };
}
