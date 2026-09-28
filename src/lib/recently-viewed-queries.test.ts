import { describe, expect, it } from "vitest";

import { matchRecentlyViewedRoute } from "./recently-viewed-queries";

describe("matchRecentlyViewedRoute", () => {
  it("recognises course, draft, lesson and lesson-test routes", () => {
    expect(matchRecentlyViewedRoute("/courses/polinomi")).toEqual({
      courseId: "polinomi",
      kind: "course",
    });
    expect(matchRecentlyViewedRoute("/drafts/polinomi")).toEqual({
      courseId: "polinomi",
      kind: "draft",
    });
    expect(matchRecentlyViewedRoute("/courses/polinomi/lessons/lesson-01")).toEqual({
      courseId: "polinomi",
      kind: "lesson",
    });
    expect(matchRecentlyViewedRoute("/courses/polinomi/lessons/lesson-01/test")).toEqual({
      courseId: "polinomi",
      kind: "lesson",
    });
  });

  it("ignores static and transient routes", () => {
    expect(matchRecentlyViewedRoute("/")).toBeNull();
    expect(matchRecentlyViewedRoute("/my-courses")).toBeNull();
    expect(matchRecentlyViewedRoute("/courses/new")).toBeNull();
    expect(matchRecentlyViewedRoute("/courses/prototype-2")).toBeNull();
    expect(matchRecentlyViewedRoute("/drafts/polinomi/preview-test")).toBeNull();
    expect(matchRecentlyViewedRoute("/onboarding/role")).toBeNull();
  });
});
