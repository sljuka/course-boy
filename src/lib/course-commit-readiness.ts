import type { CourseSectionPreview } from "@/lib/course-package";

// Why the draft can't be committed as a version yet, or null if it can. Mirrors
// the cut-time check (`assertCoursePackageIsPublishable` in
// electron/course-registry.ts): at least one section, and every section has at
// least one lesson or section test. A draft may be empty; a version may not.
export type CommitBlocker =
  | { kind: "no-sections" }
  | { kind: "empty-section"; title: string };

export function getCommitBlocker(
  sections: Pick<CourseSectionPreview, "lessons" | "tests" | "title">[],
): CommitBlocker | null {
  if (sections.length === 0) {
    return { kind: "no-sections" };
  }

  const empty = sections.find((section) => section.lessons.length === 0 && section.tests.length === 0);
  return empty ? { kind: "empty-section", title: empty.title } : null;
}
