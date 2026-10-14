import crypto from "node:crypto";

import { slugifyCourseName } from "../src/lib/course-slug";

// The ids of a course's sections, lessons and tests, and their order.
//
// An id is set once, when the item is created, and never changes: it's the
// folder or file name, and a student's progress is kept under it, also across
// versions. So an id says nothing about where the item is: the order is kept
// in lists (`course.json` `sectionIds`, `section.json` `lessonIds` and
// `testIds`), which reordering will change without touching any id.
//
// New ids are `<kind>-<title slug>-<4 random characters>`, unique within the
// course (two sections can each have an "Introduction"). Older ids have a
// number instead (`section-01-welcome`); they still work, and a package
// without the lists is ordered by that number, as before.

export const sectionDirectoryPattern = /^section-[a-z0-9-]+$/;
export const lessonFilePattern = /^lesson-[a-z0-9-]+\.json$/;
export const sectionTestFilePattern = /^section-test-[a-z0-9-]+\.json$/;

// Long titles would make long file names; the random part keeps ids apart.
const MAX_SLUG_LENGTH = 40;
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_SUFFIX_LENGTH = 4;

function randomSuffix(): string {
  return Array.from(crypto.randomBytes(ID_SUFFIX_LENGTH), (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
}

export function slugForTitle(title: string, fallback: string): string {
  return slugifyCourseName(title).slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "") || fallback;
}

// A new id for a section ("section"), lesson ("lesson") or standalone test
// ("section-test"); `isTaken` checks the whole course.
export async function createStructureId(
  kind: "section" | "lesson" | "section-test",
  slug: string,
  isTaken: (id: string) => Promise<boolean>,
): Promise<string> {
  for (;;) {
    const id = `${kind}-${slug}-${randomSuffix()}`;

    if (!(await isTaken(id))) {
      return id;
    }
  }
}

// The items on disk in their order: the listed ones first, in the list's
// order (ids no longer on disk skipped), then any not listed, by the number in
// their id (a package from before the lists, or one edited by hand).
export function orderIds(listed: unknown, onDisk: string[]): string[] {
  const present = new Set(onDisk);
  const ordered = Array.isArray(listed)
    ? [...new Set(listed.filter((id): id is string => typeof id === "string" && present.has(id)))]
    : [];
  const included = new Set(ordered);
  const rest = onDisk
    .filter((id) => !included.has(id))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  return [...ordered, ...rest];
}
