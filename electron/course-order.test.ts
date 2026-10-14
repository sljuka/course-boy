import { describe, expect, it } from "vitest";

import { createStructureId, orderIds, slugForTitle } from "./course-order";

describe("orderIds", () => {
  it("follows the list, skips listed ids that are gone, and puts unlisted ones after by their number", () => {
    expect(
      orderIds(["section-b-aaaa", "section-gone-zzzz", "section-a-bbbb"], [
        "section-02-old",
        "section-a-bbbb",
        "section-b-aaaa",
        "section-10-old",
      ]),
    ).toEqual(["section-b-aaaa", "section-a-bbbb", "section-02-old", "section-10-old"]);
  });

  it("orders a package without a list by the number in its ids", () => {
    expect(orderIds(undefined, ["lesson-10-c", "lesson-02-b", "lesson-01-a"])).toEqual([
      "lesson-01-a",
      "lesson-02-b",
      "lesson-10-c",
    ]);
  });
});

describe("createStructureId", () => {
  it("is the kind, the title's slug and a random part, with no number for its place", async () => {
    const id = await createStructureId("lesson", slugForTitle("Sabiranje do 100", "untitled-lesson"), async () => false);

    expect(id).toMatch(/^lesson-sabiranje-do-100-[a-z0-9]{4}$/);
  });

  it("tries again while the id is taken", async () => {
    const taken = new Set<string>();
    let tries = 0;
    const id = await createStructureId("section", "intro", async (candidate) => {
      tries += 1;
      if (tries < 3) {
        taken.add(candidate);
        return true;
      }
      return false;
    });

    expect(tries).toBe(3);
    expect(taken.has(id)).toBe(false);
  });

  it("keeps slugs short, and falls back for a title with no letters", () => {
    expect(slugForTitle("a".repeat(100), "x")).toHaveLength(40);
    expect(slugForTitle("???", "untitled-test")).toBe("untitled-test");
  });
});
