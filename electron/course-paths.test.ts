import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  copyDirectoryWithDedup,
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  cutLocalCourseVersion,
  ensureLocalCoursesRoot,
  publishLocalCourseVersion,
  revertLocalCourseDraftToVersion,
} from "./course-paths";
import { getCourseVersionHistory } from "./course-registry";

let userDataDir = "";

vi.mock("electron", () => ({
  app: {
    getName: () => "matko",
    getPath: () => userDataDir,
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

process.env.APP_ROOT = process.cwd();

async function seedDraftCourse(): Promise<string> {
  const { courseId } = await createLocalCourseDraft({
    defaultLocale: "en",
    locales: { en: { description: "A test course", title: "Test Course" } },
    supportedLocales: ["en"],
  });
  const { sectionId } = await createLocalCourseSection({
    courseId,
    title: "Section One",
  });
  await createLocalCourseLesson({
    courseId,
    sectionId,
    title: "Lesson One",
  });

  return courseId;
}

beforeEach(async () => {
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-course-paths-"));
});

afterEach(async () => {
  await fs.rm(userDataDir, { force: true, recursive: true });
});

describe("copyDirectoryWithDedup", () => {
  it("hardlinks unchanged files and copies changed ones", async () => {
    const sourceDir = path.join(userDataDir, "source");
    const previousDir = path.join(userDataDir, "previous");

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, "unchanged.txt"), "same content");
    await fs.writeFile(path.join(sourceDir, "changed.txt"), "new content");

    const previousHashes = await copyDirectoryWithDedup(sourceDir, previousDir, null);

    await fs.writeFile(path.join(sourceDir, "changed.txt"), "different content");

    const targetDir = path.join(userDataDir, "target");

    await copyDirectoryWithDedup(sourceDir, targetDir, {
      directoryPath: previousDir,
      fileHashes: previousHashes,
    });

    const unchangedPreviousStat = await fs.stat(path.join(previousDir, "unchanged.txt"));
    const unchangedTargetStat = await fs.stat(path.join(targetDir, "unchanged.txt"));
    const changedPreviousStat = await fs.stat(path.join(previousDir, "changed.txt"));
    const changedTargetStat = await fs.stat(path.join(targetDir, "changed.txt"));

    expect(unchangedTargetStat.ino).toBe(unchangedPreviousStat.ino);
    expect(changedTargetStat.ino).not.toBe(changedPreviousStat.ino);
    expect(await fs.readFile(path.join(targetDir, "changed.txt"), "utf8")).toBe(
      "different content",
    );
  });
});

describe("cutLocalCourseVersion", () => {
  it("cuts patch, minor, and major versions", async () => {
    const courseId = await seedDraftCourse();

    const patchResult = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    expect(patchResult.version).toBe("0.1.1");

    const minorResult = await cutLocalCourseVersion({ courseId, releaseType: "minor" });
    expect(minorResult.version).toBe("0.2.0");

    const majorResult = await cutLocalCourseVersion({ courseId, releaseType: "major" });
    expect(majorResult.version).toBe("1.0.0");
  });

  it("shares unchanged files between cuts via hardlinks", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const versionsDir = path.join(localCoursesRoot, courseId, "versions");

    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const second = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    const firstVersionEntries = await fs.readdir(path.join(versionsDir, first.version));
    const sectionDirName = firstVersionEntries.find((name) => name.startsWith("section-"));
    expect(sectionDirName).toBeDefined();

    const firstSectionStat = await fs.stat(
      path.join(versionsDir, first.version, sectionDirName!, "section.json"),
    );
    const secondSectionStat = await fs.stat(
      path.join(versionsDir, second.version, sectionDirName!, "section.json"),
    );

    // Untouched between the two cuts, so it should be hardlinked, not duplicated.
    expect(secondSectionStat.ino).toBe(firstSectionStat.ino);
  });

  it("rejects a draft with no sections and leaves no snapshot behind", async () => {
    const { courseId } = await createLocalCourseDraft({
      defaultLocale: "en",
      locales: { en: { description: "Empty", title: "Empty Course" } },
      supportedLocales: ["en"],
    });

    await expect(cutLocalCourseVersion({ courseId, releaseType: "patch" })).rejects.toThrow();

    const localCoursesRoot = await ensureLocalCoursesRoot();
    const targetSnapshotExists = await fs
      .access(path.join(localCoursesRoot, courseId, "versions", "0.1.1"))
      .then(
        () => true,
        () => false,
      );

    expect(targetSnapshotExists).toBe(false);
  });

  it("rejects cutting a version that has already been cut", async () => {
    const courseId = await seedDraftCourse();
    await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    const localCoursesRoot = await ensureLocalCoursesRoot();
    const manifestPath = path.join(localCoursesRoot, courseId, "draft", "course.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      version: string;
      versionInfo: unknown;
    };

    // Rewind the draft's version so the next cut recomputes an already-cut target.
    manifest.version = "0.1.0";
    manifest.versionInfo = { major: 0, minor: 1, patch: 0, releaseType: "initial" };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    await expect(cutLocalCourseVersion({ courseId, releaseType: "patch" })).rejects.toThrow(
      /already been cut/,
    );
  });
});

describe("revertLocalCourseDraftToVersion", () => {
  it("restores draft content and resets its version", async () => {
    const courseId = await seedDraftCourse();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    await createLocalCourseSection({ courseId, title: "Section Two" });

    await revertLocalCourseDraftToVersion({ courseId, version: cut.version });

    const localCoursesRoot = await ensureLocalCoursesRoot();
    const draftDir = path.join(localCoursesRoot, courseId, "draft");
    const manifest = JSON.parse(await fs.readFile(path.join(draftDir, "course.json"), "utf8"));
    const entries = await fs.readdir(draftDir, { withFileTypes: true });
    const sectionDirs = entries.filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("section-"),
    );

    expect(manifest.status).toBe("draft");
    expect(manifest.version).toBe(cut.version);
    expect(sectionDirs).toHaveLength(1);
  });

  it("rejects reverting to a nonexistent version", async () => {
    const courseId = await seedDraftCourse();

    await expect(
      revertLocalCourseDraftToVersion({ courseId, version: "9.9.9" }),
    ).rejects.toThrow();
  });

  it("discards a staging directory left by a revert that never committed", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const courseRootPath = path.join(localCoursesRoot, courseId);
    const stagingPath = path.join(courseRootPath, ".draft-staging-simulated");

    await fs.mkdir(stagingPath, { recursive: true });
    await ensureLocalCoursesRoot();

    const stagingExists = await fs.access(stagingPath).then(
      () => true,
      () => false,
    );
    const draftExists = await fs.access(path.join(courseRootPath, "draft")).then(
      () => true,
      () => false,
    );

    expect(stagingExists).toBe(false);
    expect(draftExists).toBe(true);
  });

  it("completes an interrupted revert when draft is missing but staging exists", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const courseRootPath = path.join(localCoursesRoot, courseId);
    const draftPath = path.join(courseRootPath, "draft");
    const stagingPath = path.join(courseRootPath, ".draft-staging-simulated");

    await fs.rename(draftPath, stagingPath);
    await ensureLocalCoursesRoot();

    const draftExists = await fs.access(draftPath).then(
      () => true,
      () => false,
    );
    const stagingExists = await fs.access(stagingPath).then(
      () => true,
      () => false,
    );

    expect(draftExists).toBe(true);
    expect(stagingExists).toBe(false);
  });
});

describe("publishLocalCourseVersion", () => {
  it("publishes a version and lets a later publish supersede it", async () => {
    const courseId = await seedDraftCourse();
    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const second = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    await publishLocalCourseVersion({ courseId, version: first.version });
    await publishLocalCourseVersion({ courseId, version: second.version });

    const localCoursesRoot = await ensureLocalCoursesRoot();
    const releaseState = JSON.parse(
      await fs.readFile(path.join(localCoursesRoot, courseId, "release.json"), "utf8"),
    );

    expect(releaseState.publishedVersion).toBe(second.version);
    expect(releaseState.everPublishedVersions).toEqual([first.version, second.version]);
  });

  it("rejects publishing a version that was already published", async () => {
    const courseId = await seedDraftCourse();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    await publishLocalCourseVersion({ courseId, version: cut.version });

    await expect(publishLocalCourseVersion({ courseId, version: cut.version })).rejects.toThrow(
      /already been published/,
    );
  });

  it("rejects publishing a version that was never cut", async () => {
    const courseId = await seedDraftCourse();

    await expect(
      publishLocalCourseVersion({ courseId, version: "9.9.9" }),
    ).rejects.toThrow();
  });
});

describe("getCourseVersionHistory", () => {
  it("reflects cut and published versions, sorted newest first", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();

    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const second = await cutLocalCourseVersion({ courseId, releaseType: "minor" });
    await publishLocalCourseVersion({ courseId, version: first.version });

    const history = await getCourseVersionHistory(localCoursesRoot, courseId);

    expect(history?.currentDraftVersion).toBe(second.version);
    expect(history?.publishedVersion).toBe(first.version);
    expect(history?.versions.map((entry) => entry.version)).toEqual([
      second.version,
      first.version,
    ]);
    expect(
      history?.versions.find((entry) => entry.version === first.version)?.isEverPublished,
    ).toBe(true);
    expect(
      history?.versions.find((entry) => entry.version === second.version)
        ?.isCurrentlyPublished,
    ).toBe(false);
  });

  it("returns an empty version list for a course with no cut versions", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();

    const history = await getCourseVersionHistory(localCoursesRoot, courseId);

    expect(history?.versions).toEqual([]);
    expect(history?.publishedVersion).toBeNull();
  });
});
