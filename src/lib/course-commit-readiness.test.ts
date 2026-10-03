import { describe, expect, it } from "vitest";

import { getCommitBlocker } from "@/lib/course-commit-readiness";

const lesson = { id: "lesson-01-a" } as never;
const test = { id: "section-test-01-a" } as never;

describe("getCommitBlocker", () => {
  it("blocks a course with no sections", () => {
    expect(getCommitBlocker([])).toEqual({ kind: "no-sections" });
  });

  it("names the first section with neither lessons nor tests", () => {
    expect(
      getCommitBlocker([
        { lessons: [lesson], tests: [], title: "Intro" },
        { lessons: [], tests: [], title: "Empty one" },
      ]),
    ).toEqual({ kind: "empty-section", title: "Empty one" });
  });

  it("accepts sections with a lesson or only a section test", () => {
    expect(
      getCommitBlocker([
        { lessons: [lesson], tests: [], title: "Intro" },
        { lessons: [], tests: [test], title: "Quiz" },
      ]),
    ).toBeNull();
  });
});
