import { describe, expect, it } from "vitest";

import { courseEntryState, firstStepNotDone } from "@/lib/course-entry";
import type { CourseProgress } from "@/lib/course-progress";

// SLJ-171: Start, Resume or Retake, and where Resume goes.
const sections = [
  { lessons: [{ id: "l1", test: null }, { id: "l2", test: { id: "l2-test" } }], tests: [] },
  { lessons: [{ id: "l3", test: null }], tests: [{ id: "final" }] },
];

function progress(done: string[], startedAt?: string): CourseProgress {
  return { startedAt, steps: Object.fromEntries(done.map((id) => [id, { doneAt: "2026-10-19T10:00:00Z" }])) } as CourseProgress;
}

describe("course entry", () => {
  it("starts a course nothing was done in, and resumes one only opened", () => {
    expect(courseEntryState(sections, undefined)).toBe("start");
    expect(courseEntryState(sections, progress([], "2026-10-19T09:00:00Z"))).toBe("resume");
  });

  it("resumes at the first step not done, also after skipping ahead", () => {
    // Skipped to the final test: back to the first lesson.
    expect(courseEntryState(sections, progress(["final"]))).toBe("resume");
    expect(firstStepNotDone(sections, progress(["final"]))).toEqual({ id: "l1", kind: "lesson" });
    // A lesson's own test opens under its lesson.
    expect(firstStepNotDone(sections, progress(["l1", "l2"]))).toEqual({ id: "l2-test", kind: "test", lessonId: "l2" });
    expect(firstStepNotDone(sections, progress(["l1", "l2", "l2-test", "l3"]))).toEqual({
      id: "final",
      kind: "test",
      lessonId: "final",
    });
  });

  it("offers a retake once every step is done", () => {
    const all = progress(["l1", "l2", "l2-test", "l3", "final"]);
    expect(courseEntryState(sections, all)).toBe("retake");
    expect(firstStepNotDone(sections, all)).toBeNull();
  });
});
