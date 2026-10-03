import { describe, expect, it } from "vitest";

import { buildSectionPreviewItems } from "@/components/course-preview-strip-items";
import type { CourseDetails, CourseSectionPreview } from "@/lib/course-package";
import { getEntryStep, introStepId } from "@/lib/course-utils";

const lesson = { body: "", description: "", iconUrl: null, id: "lesson-01-halves", test: null, title: "Halves" };
const section = (overrides: Partial<CourseSectionPreview>): CourseSectionPreview => ({
  id: "section-01-fractions",
  intro: null,
  lessons: [lesson],
  locales: {} as CourseSectionPreview["locales"],
  tests: [],
  title: "Fractions",
  ...overrides,
});
const course = (sections: CourseSectionPreview[]) =>
  ({ entrySectionId: sections[0]?.id ?? null, sections }) as unknown as CourseDetails;

// SLJ-45: a section's intro is its first step.
describe("section intro steps", () => {
  it("starts the course at the first section's intro when it has one", () => {
    expect(getEntryStep(course([section({ intro: "Welcome." })]))).toEqual({
      id: introStepId("section-01-fractions"),
      kind: "lesson",
    });
    expect(getEntryStep(course([section({})]))).toEqual({ id: "lesson-01-halves", kind: "lesson" });
  });

  it("puts the intro first among a section's tiles", () => {
    const items = buildSectionPreviewItems(section({ intro: "Welcome." }), { introTitle: "Introduction" });

    expect(items.map((item) => item.title)).toEqual(["Introduction", "Halves"]);
    expect(buildSectionPreviewItems(section({}), { introTitle: "Introduction" }).map((item) => item.title)).toEqual([
      "Halves",
    ]);
  });
});
