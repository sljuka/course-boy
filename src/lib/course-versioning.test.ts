import { describe, expect, it } from "vitest";

import {
  bumpCourseVersion,
  createInitialCourseVersion,
  formatCourseVersion,
  parseCourseVersion,
} from "@/lib/course-versioning";

describe("course versioning", () => {
  it("creates the initial draft version", () => {
    const versionInfo = createInitialCourseVersion();

    expect(versionInfo).toEqual({
      major: 0,
      minor: 1,
      patch: 0,
      releaseType: "initial",
    });
    expect(formatCourseVersion(versionInfo)).toBe("0.1.0");
  });

  it("parses a semantic version string", () => {
    expect(parseCourseVersion("1.4.2")).toEqual({
      major: 1,
      minor: 4,
      patch: 2,
      releaseType: "initial",
    });
  });

  it("bumps patch, minor, and major versions", () => {
    const baseVersion = parseCourseVersion("1.4.2");

    expect(formatCourseVersion(bumpCourseVersion(baseVersion, "patch"))).toBe(
      "1.4.3",
    );
    expect(formatCourseVersion(bumpCourseVersion(baseVersion, "minor"))).toBe(
      "1.5.0",
    );
    expect(formatCourseVersion(bumpCourseVersion(baseVersion, "major"))).toBe(
      "2.0.0",
    );
  });
});
