// A student's own progress through their courses (SLJ-50), kept per profile
// on this device only: `course-progress.json` in the profile's folder,
// written by the main process (`electron/course-progress.ts`). Never in a
// course's folder (it must not travel when a course is shared onward) and
// never in Chromium storage (every profile would see it).
//
// Progress is kept per step id: a lesson (its document read: the student
// moved past it with Continue) or a test (finished, with its score). How
// much of a course is done is worked out against the course's *current*
// steps (`summarizeCourseProgress`), so an update that adds lessons makes a
// finished course unfinished again, with nothing to migrate.
//
// The import date isn't here: the sharing state already has it
// (`followedSince`, shown as "Imported").

// One finished run through a test. `correct` counts answers right on the
// first try (in interactive mode with "require a correct answer" every
// finished test would otherwise be all correct); `longestStreak` is the
// longest run of first-try correct answers in a row.
export type TestAttemptResult = {
  correct: number;
  longestStreak: number;
  total: number;
};

export type TestAttempt = TestAttemptResult & { at: string };

export type TestProgress = {
  attempts: number;
  best: TestAttempt;
  latest: TestAttempt;
};

export type StepProgress = {
  doneAt?: string;
  test?: TestProgress;
};

export type CourseProgress = {
  favorite?: boolean;
  // When it was starred, so the sidebar's Favorites list them in that order.
  favoritedAt?: string;
  lastOpenedAt?: string;
  startedAt?: string;
  steps: Record<string, StepProgress>;
};

// A program the student starred (SLJ-32), kept beside their courses.
export type ProgramFavorite = {
  favorite?: boolean;
  favoritedAt?: string;
};

export type CourseProgressState = {
  courses: Record<string, CourseProgress>;
  // Missing in files written before programs could be starred.
  programs?: Record<string, ProgramFavorite>;
};

export type RecordTestResultInput = {
  courseId: string;
  result: TestAttemptResult;
  // The test's step id: a standalone test's id, or for a lesson's test
  // `resolveTestIdForLesson(lessonId)` (the id course summaries list it by).
  stepId: string;
};

// How far a course is, against its current steps.
export type CourseProgressSummary = {
  // When its last step was done, once every step is; otherwise null.
  completedAt: string | null;
  done: number;
  total: number;
};

// `stepIds`: the steps a course's progress counts, its lessons and tests
// (section intros aren't steps); course summaries list them as `stepIds`, a
// lesson's attached test as its own step.
export function summarizeCourseProgress(
  stepIds: string[],
  progress: CourseProgress | undefined,
): CourseProgressSummary {
  const doneAts = stepIds.map((id) => progress?.steps[id]?.doneAt).filter((at): at is string => Boolean(at));
  const total = stepIds.length;
  const done = doneAts.length;
  const completedAt = total > 0 && done === total ? doneAts.reduce((latest, at) => (at > latest ? at : latest)) : null;

  return { completedAt, done, total };
}

// A test's result from each exercise's first-try outcome, in the order shown:
// true right first time, false wrong, null never answered (counts as wrong).
export function scoreTestAttempt(firstTryCorrect: (boolean | null)[]): TestAttemptResult {
  let longestStreak = 0;
  let streak = 0;

  for (const isCorrect of firstTryCorrect) {
    streak = isCorrect === true ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }

  return {
    correct: firstTryCorrect.filter((isCorrect) => isCorrect === true).length,
    longestStreak,
    total: firstTryCorrect.length,
  };
}

// Whether `next` beats `best`: a higher share right, then a longer streak.
export function isBetterAttempt(next: TestAttemptResult, best: TestAttemptResult): boolean {
  const nextShare = next.total > 0 ? next.correct / next.total : 0;
  const bestShare = best.total > 0 ? best.correct / best.total : 0;

  return nextShare !== bestShare ? nextShare > bestShare : next.longestStreak > best.longestStreak;
}

