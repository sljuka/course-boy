import { describe, expect, it } from "vitest";

import {
  MAX_RECENTLY_VIEWED,
  parseRecentlyViewedEntries,
  recordRecentlyViewed,
  type RecentlyViewedEntry,
} from "./recently-viewed";

function entry(overrides: Partial<RecentlyViewedEntry>): RecentlyViewedEntry {
  return {
    courseId: "polinomi",
    kind: "course",
    path: "/courses/polinomi",
    viewedAt: "2026-09-28T10:00:00.000Z",
    ...overrides,
  };
}

describe("recordRecentlyViewed", () => {
  it("puts the newest entry first", () => {
    const list = recordRecentlyViewed(
      [entry({ courseId: "a", path: "/courses/a" })],
      entry({ courseId: "b", path: "/courses/b" }),
    );

    expect(list.map((item) => item.courseId)).toEqual(["b", "a"]);
  });

  it("keeps one entry per course and kind, pointing at the latest path", () => {
    const list = recordRecentlyViewed(
      [entry({ kind: "lesson", path: "/courses/polinomi/lessons/one" }), entry({})],
      entry({ kind: "lesson", path: "/courses/polinomi/lessons/two" }),
    );

    expect(list).toHaveLength(2);
    expect(list[0].path).toBe("/courses/polinomi/lessons/two");
    expect(list[1].kind).toBe("course");
  });

  it(`caps the list at ${MAX_RECENTLY_VIEWED} entries`, () => {
    let list: RecentlyViewedEntry[] = [];

    for (let index = 0; index < MAX_RECENTLY_VIEWED + 3; index += 1) {
      list = recordRecentlyViewed(list, entry({ courseId: `c${index}` }));
    }

    expect(list).toHaveLength(MAX_RECENTLY_VIEWED);
    expect(list[0].courseId).toBe(`c${MAX_RECENTLY_VIEWED + 2}`);
  });
});

describe("parseRecentlyViewedEntries", () => {
  it("keeps valid entries and strips unknown fields", () => {
    expect(parseRecentlyViewedEntries([{ ...entry({}), extra: true }])).toEqual([entry({})]);
  });

  it("drops malformed entries", () => {
    expect(
      parseRecentlyViewedEntries([
        entry({ kind: "unknown" as RecentlyViewedEntry["kind"] }),
        entry({ path: "https://example.com" }),
        entry({ courseId: "" }),
        null,
        "nope",
      ]),
    ).toEqual([]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(parseRecentlyViewedEntries(undefined)).toEqual([]);
    expect(parseRecentlyViewedEntries({})).toEqual([]);
  });
});
