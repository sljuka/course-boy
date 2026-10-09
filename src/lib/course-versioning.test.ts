import { describe, expect, it } from "vitest";

import {
  bumpCourseVersion,
  compareCourseVersions,
  createInitialCourseVersion,
  formatCourseVersion,
  isCourseVersion,
  nextCourseVersion,
  parseCourseVersion,
} from "@/lib/course-versioning";

describe("course versioning", () => {
  it("creates the initial draft version", () => {
    const versionInfo = createInitialCourseVersion();

    expect(versionInfo).toEqual({ major: 0, minor: 1, releaseType: "initial" });
    expect(formatCourseVersion(versionInfo)).toBe("0.1");
  });

  it("parses a two-number version", () => {
    expect(parseCourseVersion("1.4")).toEqual({ major: 1, minor: 4, releaseType: "initial" });
  });

  it("refuses three-number versions written by earlier builds", () => {
    expect(() => parseCourseVersion("1.4.2")).toThrow(/Invalid course version/);
    expect(isCourseVersion("1.4.2")).toBe(false);
    expect(isCourseVersion("1.4")).toBe(true);
    expect(isCourseVersion("../1.4")).toBe(false);
  });

  it("an update counts up the second number, a new edition the first", () => {
    const baseVersion = parseCourseVersion("1.4");

    expect(formatCourseVersion(bumpCourseVersion(baseVersion, "minor"))).toBe("1.5");
    expect(formatCourseVersion(bumpCourseVersion(baseVersion, "major"))).toBe("2.0");
  });

  it("compares versions numerically, not lexicographically", () => {
    expect(compareCourseVersions(parseCourseVersion("1.2"), parseCourseVersion("1.2"))).toBe(0);
    expect(compareCourseVersions(parseCourseVersion("1.9"), parseCourseVersion("1.10"))).toBeLessThan(0);
    expect(compareCourseVersions(parseCourseVersion("2.0"), parseCourseVersion("1.99"))).toBeGreaterThan(0);
  });
});

describe("nextCourseVersion", () => {
  it("bumps the draft's number when it is the newest", () => {
    expect(nextCourseVersion("0.3", "0.3", "minor")).toBe("0.4");
    expect(nextCourseVersion("0.3", "0.3", "major")).toBe("1.0");
  });

  it("counts up from the newest cut version after a revert", () => {
    expect(nextCourseVersion("0.2", "0.4", "minor")).toBe("0.5");
  });

  it("bumps the draft's number before any version exists", () => {
    expect(nextCourseVersion("0.1", null, "minor")).toBe("0.2");
  });
});
