// A course version is two numbers, `major.minor` (2026-10-09; earlier builds
// wrote a third, patch number, which no longer loads):
// - an update counts up the second number (1.3 → 1.4);
// - a new edition counts up the first (1.3 → 2.0). Students are shown it as a
//   big change, with its notes (course-sharing.ts: `isMajor`).
// Whether a version fixes mistakes is its own flag (`recommended` in the
// changelog), not part of the number.
export type CourseVersionReleaseType = "initial" | "major" | "minor";

export type CourseVersionInfo = {
  major: number;
  minor: number;
  releaseType: CourseVersionReleaseType;
};

const COURSE_VERSION_PATTERN = /^(\d+)\.(\d+)$/;

export function formatCourseVersion(versionInfo: Pick<CourseVersionInfo, "major" | "minor">) {
  return `${versionInfo.major}.${versionInfo.minor}`;
}

// Whether `value` is a version number (it can become a folder name).
export function isCourseVersion(value: unknown): value is string {
  return typeof value === "string" && COURSE_VERSION_PATTERN.test(value);
}

export function parseCourseVersion(version: string): CourseVersionInfo {
  const match = version.match(COURSE_VERSION_PATTERN);

  if (!match) {
    throw new Error(`Invalid course version "${version}"`);
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    releaseType: "initial",
  };
}

export function bumpCourseVersion(
  versionInfo: CourseVersionInfo,
  releaseType: Exclude<CourseVersionReleaseType, "initial">,
): CourseVersionInfo {
  switch (releaseType) {
    case "major":
      return { major: versionInfo.major + 1, minor: 0, releaseType };
    case "minor":
      return { major: versionInfo.major, minor: versionInfo.minor + 1, releaseType };
  }
}

export function createInitialCourseVersion(): CourseVersionInfo {
  return { major: 0, minor: 1, releaseType: "initial" };
}

export function compareCourseVersions(
  left: Pick<CourseVersionInfo, "major" | "minor">,
  right: Pick<CourseVersionInfo, "major" | "minor">,
): number {
  return left.major - right.major || left.minor - right.minor;
}

// The version a cut with `releaseType` creates: counted up from the newer of
// the draft's own number and the newest version already cut (a revert puts an
// older number in the draft, and bumping from that would hit an existing
// version). Shared by the cut (electron/course-paths.ts) and the Commit
// dialog's preview, so the number shown is the number made.
export function nextCourseVersion(
  draftVersion: string,
  newestCutVersion: string | null,
  releaseType: Exclude<CourseVersionReleaseType, "initial">,
): string {
  const draft = parseCourseVersion(draftVersion);
  const newest = newestCutVersion ? parseCourseVersion(newestCutVersion) : null;
  const base = newest && compareCourseVersions(newest, draft) > 0 ? newest : draft;

  return formatCourseVersion(bumpCourseVersion(base, releaseType));
}
