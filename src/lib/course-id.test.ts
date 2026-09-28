import { describe, expect, it } from "vitest";

import { COURSE_ID_LENGTH, createCourseId, isValidCourseId } from "./course-id";

describe("createCourseId", () => {
  it("creates 16 lowercase base32 characters", () => {
    for (let index = 0; index < 50; index += 1) {
      const id = createCourseId();

      expect(id).toHaveLength(COURSE_ID_LENGTH);
      expect(isValidCourseId(id)).toBe(true);
    }
  });

  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createCourseId()));

    expect(ids.size).toBe(1000);
  });
});

describe("isValidCourseId", () => {
  it("rejects legacy slug ids, traversal and malformed values", () => {
    expect(isValidCourseId("polinomi")).toBe(false);
    expect(isValidCourseId("matko-getting-started")).toBe(false);
    expect(isValidCourseId("../../aaaaaaaaaaaa")).toBe(false);
    expect(isValidCourseId("aaaaaaaaaaaaaaa")).toBe(false);
    expect(isValidCourseId("aaaaaaaaaaaaaaaaa")).toBe(false);
    expect(isValidCourseId("AAAAAAAAAAAAAAAA")).toBe(false);
    expect(isValidCourseId("aaaaaaaaaaaaaaa1")).toBe(false);
    expect(isValidCourseId(undefined)).toBe(false);
  });
});
