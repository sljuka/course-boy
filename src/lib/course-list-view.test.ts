import { describe, expect, it } from "vitest";

import { DEFAULT_COURSE_LIST_VIEW, parseCourseListView } from "./course-list-view";

describe("parseCourseListView", () => {
  it("keeps a known view and falls back for anything else", () => {
    expect(parseCourseListView("list")).toBe("list");
    expect(parseCourseListView("table")).toBe("table");
    expect(parseCourseListView("board")).toBe(DEFAULT_COURSE_LIST_VIEW);
    expect(parseCourseListView(undefined)).toBe(DEFAULT_COURSE_LIST_VIEW);
  });
});
