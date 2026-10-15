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
  // A graded test's score (SLJ-135): the points of the exercises solved
  // correctly, out of all of them. Missing for a practice test.
  maxPoints?: number;
  points?: number;
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

// The course's spree (SLJ-134): answers right on the first try in a row,
// across all of the course's tests, in interactive mode. `best` is the
// longest it has been.
export type CourseSpree = {
  best: number;
  current: number;
};

export type CourseProgress = {
  favorite?: boolean;
  // When it was starred, so the sidebar's Favorites list them in that order.
  favoritedAt?: string;
  lastOpenedAt?: string;
  // Missing until the first answer in interactive mode.
  spree?: CourseSpree;
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

// How far the student is through a program: "finished" once every one of its
// courses is here and finished, "started" once any of them is started (or a
// step done), "not-started" otherwise. `courses`: the courses on this device.
export type ProgramProgressStatus = "finished" | "not-started" | "started";

export function summarizeProgramProgress(
  courseIds: string[],
  courses: { id: string; stepIds: string[] }[],
  progress: Record<string, CourseProgress> | undefined,
): ProgramProgressStatus {
  const summaries = courseIds.map((courseId) => {
    const course = courses.find((candidate) => candidate.id === courseId);
    const courseProgress = progress?.[courseId];
    return {
      isFinished: Boolean(course && summarizeCourseProgress(course.stepIds, courseProgress).completedAt),
      isStarted: Boolean(courseProgress?.startedAt) || Object.values(courseProgress?.steps ?? {}).some((step) => step.doneAt),
    };
  });
  if (summaries.length > 0 && summaries.every((summary) => summary.isFinished)) return "finished";
  return summaries.some((summary) => summary.isStarted || summary.isFinished) ? "started" : "not-started";
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

// A graded test's attempt (SLJ-135): every exercise right or not as answered
// at "Finish test", with its points. With partial credit, a wrong exercise's
// `share` of right parts earns that share of its points, rounded.
export function scoreGradedAttempt(
  exercises: { isCorrect: boolean; points: number; share?: number }[],
): TestAttemptResult {
  const earned = (exercise: { isCorrect: boolean; points: number; share?: number }) =>
    exercise.isCorrect ? exercise.points : Math.round(exercise.points * (exercise.share ?? 0));

  return {
    ...scoreTestAttempt(exercises.map((exercise) => exercise.isCorrect)),
    maxPoints: exercises.reduce((sum, exercise) => sum + exercise.points, 0),
    points: exercises.reduce((sum, exercise) => sum + earned(exercise), 0),
  };
}

// The share of an attempt that was right: of the points in a graded test,
// of the exercises otherwise.
function attemptShare(attempt: TestAttemptResult): number {
  if (attempt.maxPoints !== undefined && attempt.points !== undefined) {
    return attempt.maxPoints > 0 ? attempt.points / attempt.maxPoints : 0;
  }

  return attempt.total > 0 ? attempt.correct / attempt.total : 0;
}

// Whether `next` beats `best`: a higher share right, then a longer streak.
export function isBetterAttempt(next: TestAttemptResult, best: TestAttemptResult): boolean {
  const nextShare = attemptShare(next);
  const bestShare = attemptShare(best);

  return nextShare !== bestShare ? nextShare > bestShare : next.longestStreak > best.longestStreak;
}


// The spree after one more first try: one longer if it was right, back to
// none if not. The best is kept.
export function nextSpree(spree: CourseSpree | undefined, isCorrect: boolean): CourseSpree {
  const current = isCorrect ? (spree?.current ?? 0) + 1 : 0;

  return { best: Math.max(spree?.best ?? 0, current), current };
}

// How brightly the spree's bolt glows: 0 none yet, then 1–2, 3–5, 6–9, 10+.
export type SpreeLevel = 0 | 1 | 2 | 3 | 4;

export function spreeLevel(current: number): SpreeLevel {
  if (current >= 10) return 4;
  if (current >= 6) return 3;
  if (current >= 3) return 2;
  return current >= 1 ? 1 : 0;
}
