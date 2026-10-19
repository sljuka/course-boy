import type { CourseProgress } from "@/lib/course-progress";

// Where the course page's ▶ takes a student, and what it's called (SLJ-171):
//
// - start: nothing done yet, the course not opened → its first step (the
//   entry section's intro, when it has one: `getEntryStep`);
// - resume: some steps done, or the course opened → the first step not done,
//   in order, so a student who skipped ahead goes back to what they missed;
// - retake: every step done → asks first (Review or Start over), then the
//   first step.
//
// "Done" is course progress: a lesson moved past with Continue, a test
// finished, whatever its score. Section intros aren't steps.

// The steps progress counts, in the player's order: per section, each lesson
// then its own test, then the section's tests.
type StepSection = {
  lessons: { id: string; test: { id: string } | null }[];
  tests: { id: string }[];
};

// A step to open: a lesson, or a test (a lesson's own test opens under its
// lesson: `lessonId`).
export type CourseEntryTarget = { id: string; kind: "lesson" } | { id: string; kind: "test"; lessonId: string };

export type CourseEntryState = "resume" | "retake" | "start";

function orderedSteps(sections: StepSection[]): CourseEntryTarget[] {
  return sections.flatMap((section) => [
    ...section.lessons.flatMap((lesson) => [
      { id: lesson.id, kind: "lesson" as const },
      ...(lesson.test ? [{ id: lesson.test.id, kind: "test" as const, lessonId: lesson.id }] : []),
    ]),
    ...section.tests.map((test) => ({ id: test.id, kind: "test" as const, lessonId: test.id })),
  ]);
}

export function courseEntryState(sections: StepSection[], progress: CourseProgress | undefined): CourseEntryState {
  const steps = orderedSteps(sections);
  const done = steps.filter((step) => progress?.steps[step.id]?.doneAt).length;
  if (steps.length > 0 && done === steps.length) return "retake";
  return done > 0 || progress?.startedAt ? "resume" : "start";
}

// The first step not done yet, or null when every step is (or there are none).
export function firstStepNotDone(sections: StepSection[], progress: CourseProgress | undefined): CourseEntryTarget | null {
  return orderedSteps(sections).find((step) => !progress?.steps[step.id]?.doneAt) ?? null;
}
