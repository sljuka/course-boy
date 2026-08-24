export type CourseVersionReleaseType = "initial" | "major" | "minor" | "patch";

export type CourseVersionInfo = {
  major: number;
  minor: number;
  patch: number;
  releaseType: CourseVersionReleaseType;
};

export function formatCourseVersion(versionInfo: CourseVersionInfo) {
  return `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}`;
}

export function parseCourseVersion(version: string): CourseVersionInfo {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    throw new Error(`Invalid course version "${version}"`);
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    releaseType: "initial",
  };
}

export function bumpCourseVersion(
  versionInfo: CourseVersionInfo,
  releaseType: Exclude<CourseVersionReleaseType, "initial">,
): CourseVersionInfo {
  switch (releaseType) {
    case "major":
      return {
        major: versionInfo.major + 1,
        minor: 0,
        patch: 0,
        releaseType,
      };
    case "minor":
      return {
        major: versionInfo.major,
        minor: versionInfo.minor + 1,
        patch: 0,
        releaseType,
      };
    case "patch":
      return {
        major: versionInfo.major,
        minor: versionInfo.minor,
        patch: versionInfo.patch + 1,
        releaseType,
      };
  }
}

export function createInitialCourseVersion(): CourseVersionInfo {
  return {
    major: 0,
    minor: 1,
    patch: 0,
    releaseType: "initial",
  };
}

export function compareCourseVersions(
  left: CourseVersionInfo,
  right: CourseVersionInfo,
): number {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  );
}
