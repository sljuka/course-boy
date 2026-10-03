import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyImportedCourseUpdate,
  cleanUpInterruptedCourseUpdates,
  copyDirectoryWithDedup,
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  cutLocalCourseVersion,
  ensureLocalCoursesRoot,
  forgetLocalCoursesRootSetupForTests,
  getUnusedDraftAssets,
  hashFileContents,
  listImportedCourseVersions,
  migrateImportedCourse,
  openCourseDirectoryInFileSystem,
  publishLocalCourseVersion,
  readImportedCourseVersion,
  revertLocalCourseDraftToVersion,
  switchImportedCourseVersion,
  updateLocalCourseDraftMetadata,
  uploadCourseAssetFromBytes,
} from "./course-paths";
import { getCourseVersionHistory, listCourses } from "./course-registry";
import { shell } from "electron";

let userDataDir = "";

vi.mock("electron", () => ({
  app: {
    getName: () => "matko",
    getPath: () => userDataDir,
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  shell: {
    openPath: vi.fn(async () => ""),
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

  // version-meta.json's hashes are the version's integrity record (planned: a
  // publisher signs it), so each must match the file actually in the version —
  // including course.json, which the cut rewrites with the new version number.
  it("records a hash in version-meta.json for exactly the files in the version", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const versionDir = path.join(localCoursesRoot, courseId, "versions", cut.version);

    const meta = JSON.parse(await fs.readFile(path.join(versionDir, "version-meta.json"), "utf8"));
    const filesOnDisk = (await fs.readdir(versionDir, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(versionDir, path.join(entry.parentPath, entry.name)))
      .filter((relativePath) => relativePath !== "version-meta.json")
      .sort();

    expect(Object.keys(meta.fileHashes).sort()).toEqual(filesOnDisk);
    for (const relativePath of filesOnDisk) {
      expect(meta.fileHashes[relativePath], relativePath).toBe(
        await hashFileContents(path.join(versionDir, relativePath)),
      );
    }
  });

  // A revert copies the old version's course.json (and its version number) into
  // the draft, so the next cut must count up from the newest version, not from
  // the draft's own number (SLJ-23).
  // A revert used to copy the version's own version-meta.json into the draft
  // as a hardlink; the next cut copied it on into the new version and then
  // rewrote it in place, overwriting the old version's file hashes too.
  it("never changes an older version's version-meta.json when cutting after a revert", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const firstMetaPath = path.join(localCoursesRoot, courseId, "versions", first.version, "version-meta.json");
    const firstMetaBefore = await fs.readFile(firstMetaPath, "utf8");

    await revertLocalCourseDraftToVersion({ courseId, version: first.version });
    await updateLocalCourseDraftMetadata({
      contentRating: "all-ages",
      courseId,
      defaultLocale: "en",
      descriptiveTags: [],
      locales: { en: { description: "A test course", title: "After revert" } },
      supportedLocales: ["en"],
    });
    await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    expect(await fs.readFile(firstMetaPath, "utf8")).toBe(firstMetaBefore);
    expect(
      await fs.stat(path.join(localCoursesRoot, courseId, "draft", "version-meta.json")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
  });

  it("cuts past the newest version after reverting to an older one", async () => {
    const courseId = await seedDraftCourse();
    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const third = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    await revertLocalCourseDraftToVersion({ courseId, version: first.version });
    const afterRevert = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    expect(third.version).toBe("0.1.3");
    expect(afterRevert.version).toBe("0.1.4");
  });

  // SLJ-27: each version carries the whole history, newest first, as data.
  it("writes a cumulative, hashed changelog.json into each version", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const versionDir = (version: string) => path.join(localCoursesRoot, courseId, "versions", version);
    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    await updateLocalCourseDraftMetadata({
      contentRating: "all-ages",
      courseId,
      defaultLocale: "en",
      descriptiveTags: [],
      locales: { en: { description: "A test course", title: "Renamed" } },
      supportedLocales: ["en"],
    });
    const second = await cutLocalCourseVersion({
      courseId,
      notes: "  Fixed the title.  ",
      recommended: true,
      releaseType: "patch",
    });

    const changelog = JSON.parse(await fs.readFile(path.join(versionDir(second.version), "changelog.json"), "utf8"));
    expect(changelog.map((entry: { version: string }) => entry.version)).toEqual([second.version, first.version]);
    expect(changelog[0]).toMatchObject({
      changes: [{ field: "title", kind: "edited", target: "course" }],
      notes: "Fixed the title.",
      recommended: true,
    });
    expect(changelog[1]).toMatchObject({ changes: [], version: first.version });
    expect(changelog[1].notes).toBeUndefined();

    // Hashed like every file, and never a reason for the draft badge to flip.
    const meta = JSON.parse(await fs.readFile(path.join(versionDir(second.version), "version-meta.json"), "utf8"));
    expect(meta.fileHashes["changelog.json"]).toBe(
      await hashFileContents(path.join(versionDir(second.version), "changelog.json")),
    );
    const course = (await listCourses(localCoursesRoot)).find((entry) => entry.id === courseId);
    expect(course?.versionBadge).toEqual({ kind: "version", version: second.version });
    const history = await getCourseVersionHistory(localCoursesRoot, courseId);
    expect(history?.changelog.map((entry) => entry.version)).toEqual([second.version, first.version]);
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

  it("never re-cuts an existing version, even when the draft's number is rewound", async () => {
    const courseId = await seedDraftCourse();
    await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    const localCoursesRoot = await ensureLocalCoursesRoot();
    const manifestPath = path.join(localCoursesRoot, courseId, "draft", "course.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      version: string;
      versionInfo: unknown;
    };

    // Rewind the draft's version; before SLJ-23 the next cut recomputed an
    // already-cut target (0.1.1) and failed.
    manifest.version = "0.1.0";
    manifest.versionInfo = { major: 0, minor: 1, patch: 0, releaseType: "initial" };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const next = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    expect(next.version).toBe("0.1.2");
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
    forgetLocalCoursesRootSetupForTests(); // the next launch repairs it
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
    forgetLocalCoursesRootSetupForTests(); // the next launch repairs it
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

  // My courses groups your courses into Published / Local from these (SLJ-15).
  it("reports the published version and last edit in the course list", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const summary = async (id: string) =>
      (await listCourses(localCoursesRoot)).find((course) => course.id === id);

    expect((await summary(courseId))?.publishedVersion).toBeNull();
    expect((await summary(courseId))?.lastCutAt).toBeNull();
    expect(Number.isNaN(Date.parse((await summary(courseId))?.updatedAt ?? ""))).toBe(false);

    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    await publishLocalCourseVersion({ courseId, version: cut.version });

    expect((await summary(courseId))?.publishedVersion).toBe(cut.version);
    expect(Number.isNaN(Date.parse((await summary(courseId))?.lastCutAt ?? ""))).toBe(false);
    expect((await summary("thys2vej6my5mpxt"))?.publishedVersion).toBeNull();
  });

  it("rejects publishing a version that was never cut", async () => {
    const courseId = await seedDraftCourse();

    await expect(
      publishLocalCourseVersion({ courseId, version: "9.9.9" }),
    ).rejects.toThrow();
  });
});

describe("getCourseVersionHistory", () => {
  // The Versions panel's Draft row: "Same as 0.1.1" / "Changes since 0.1.1",
  // measured against the version the draft is based on, not the newest one.
  it("says whether the draft still matches the version it's based on", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const history = () => getCourseVersionHistory(localCoursesRoot, courseId);

    expect((await history())?.draftMatchesCurrentVersion).toBe(false);

    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    expect((await history())?.draftMatchesCurrentVersion).toBe(true);

    await updateLocalCourseDraftMetadata({
      contentRating: "all-ages",
      courseId,
      defaultLocale: "en",
      descriptiveTags: [],
      locales: { en: { description: "A test course", title: "Renamed" } },
      supportedLocales: ["en"],
    });
    expect((await history())?.draftMatchesCurrentVersion).toBe(false);

    await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    await revertLocalCourseDraftToVersion({ courseId, version: first.version });

    expect((await history())?.currentDraftVersion).toBe(first.version);
    expect((await history())?.draftMatchesCurrentVersion).toBe(true);
  });

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

describe("uploadCourseAssetFromBytes", () => {
  function bytes(text: string): ArrayBuffer {
    return new TextEncoder().encode(text).buffer as ArrayBuffer;
  }

  async function listDraftAssets(courseId: string): Promise<string[]> {
    const localCoursesRoot = await ensureLocalCoursesRoot();

    return (await fs.readdir(path.join(localCoursesRoot, courseId, "draft", "assets"))).sort();
  }

  it("names the asset after its content hash", async () => {
    const courseId = await seedDraftCourse();

    const result = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>europe</svg>"),
      filename: "Europe Map.svg",
      kind: "svg",
    });

    expect(result.path).toMatch(/^europe-map-[0-9a-f]{16}\.svg$/);
    expect(await listDraftAssets(courseId)).toEqual([result.path]);
  });

  it("reuses the existing file when the same bytes are uploaded again, even under another name", async () => {
    const courseId = await seedDraftCourse();

    const first = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>europe</svg>"),
      filename: "europe.svg",
      kind: "svg",
    });
    const again = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>europe</svg>"),
      filename: "europe.svg",
      kind: "svg",
    });
    const renamed = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>europe</svg>"),
      filename: "Countries of Europe.svg",
      kind: "svg",
    });

    expect(again.path).toBe(first.path);
    expect(renamed.path).toBe(first.path);
    expect(await listDraftAssets(courseId)).toEqual([first.path]);
  });

  it("stores different content as separate files", async () => {
    const courseId = await seedDraftCourse();

    const europe = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>europe</svg>"),
      filename: "map.svg",
      kind: "svg",
    });
    const africa = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>africa</svg>"),
      filename: "map.svg",
      kind: "svg",
    });

    expect(africa.path).not.toBe(europe.path);
    expect(await listDraftAssets(courseId)).toEqual([africa.path, europe.path].sort());
  });

  it("rejects an unsupported file type before writing anything", async () => {
    const courseId = await seedDraftCourse();

    await expect(
      uploadCourseAssetFromBytes({
        courseId,
        data: bytes("not a video"),
        filename: "notes.txt",
        kind: "video",
      }),
    ).rejects.toThrow(/Unsupported file type/);

    const localCoursesRoot = await ensureLocalCoursesRoot();
    const assetsPath = path.join(localCoursesRoot, courseId, "draft", "assets");

    await expect(fs.readdir(assetsPath)).rejects.toThrow();
  });
});

describe("cut and revert with course assets", () => {
  function bytes(text: string): ArrayBuffer {
    return new TextEncoder().encode(text).buffer as ArrayBuffer;
  }

  async function findLessonMarkdown(draftDir: string): Promise<string> {
    const entries = await fs.readdir(draftDir, { recursive: true });
    const lessonMarkdown = entries.find((entry) => entry.endsWith(".md"));

    if (!lessonMarkdown) {
      throw new Error("seeded draft has no lesson markdown");
    }

    return path.join(draftDir, lessonMarkdown);
  }

  // Replaces the file (temp + rename) the way every real draft writer does —
  // an in-place write would also change any cut version hardlinked to it.
  async function replaceFile(filePath: string, contents: string): Promise<void> {
    const tmpPath = `${filePath}.tmp-test`;

    await fs.writeFile(tmpPath, contents);
    await fs.rename(tmpPath, filePath);
  }

  async function seedCourseWithAssets(): Promise<{
    courseId: string;
    draftDir: string;
    usedAsset: string;
    unusedAsset: string;
  }> {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const draftDir = path.join(localCoursesRoot, courseId, "draft");
    const used = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>used</svg>"),
      filename: "used.svg",
      kind: "svg",
    });
    const unused = await uploadCourseAssetFromBytes({
      courseId,
      data: bytes("<svg>unused</svg>"),
      filename: "unused.svg",
      kind: "svg",
    });
    const lessonPath = await findLessonMarkdown(draftDir);

    await replaceFile(lessonPath, `${await fs.readFile(lessonPath, "utf8")}\n\n![map](${used.path})\n`);

    return { courseId, draftDir, unusedAsset: unused.path, usedAsset: used.path };
  }

  it("puts only referenced assets into the cut version, hardlinked from the draft", async () => {
    const { courseId, draftDir, unusedAsset, usedAsset } = await seedCourseWithAssets();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const versionDir = path.join(path.dirname(draftDir), "versions", cut.version);

    expect(await fs.readdir(path.join(versionDir, "assets"))).toEqual([usedAsset]);

    const draftAssetStat = await fs.stat(path.join(draftDir, "assets", usedAsset));
    const versionAssetStat = await fs.stat(path.join(versionDir, "assets", usedAsset));

    expect(versionAssetStat.ino).toBe(draftAssetStat.ino);
    // The cut removed the unused upload from the draft too.
    expect(await fs.readdir(path.join(draftDir, "assets"))).toEqual([usedAsset]);
    expect(cut.removedAssets).toEqual([unusedAsset]);
  });

  it("lists unused draft assets with their sizes before a cut", async () => {
    const { courseId, unusedAsset } = await seedCourseWithAssets();

    expect(await getUnusedDraftAssets(courseId)).toEqual([
      { filename: unusedAsset, sizeBytes: "<svg>unused</svg>".length },
    ]);
  });

  it("never breaks an older version that still uses a file the draft dropped", async () => {
    const { courseId, draftDir, usedAsset } = await seedCourseWithAssets();
    const lessonPath = await findLessonMarkdown(draftDir);
    const first = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    // Stop referencing the image, then cut again: the draft drops it…
    await replaceFile(lessonPath, (await fs.readFile(lessonPath, "utf8")).replace(usedAsset, ""));
    const second = await cutLocalCourseVersion({ courseId, releaseType: "patch" });

    expect(second.removedAssets).toEqual([usedAsset]);
    expect(await fs.readdir(path.join(draftDir, "assets"))).toEqual([]);

    // …but the first version keeps its own copy, and reverting brings it back.
    const firstVersionAsset = path.join(path.dirname(draftDir), "versions", first.version, "assets", usedAsset);

    expect(await fs.readFile(firstVersionAsset, "utf8")).toBe("<svg>used</svg>");

    await revertLocalCourseDraftToVersion({ courseId, version: first.version });

    expect(await fs.readdir(path.join(draftDir, "assets"))).toEqual([usedAsset]);
  });

  it("does not report an unused asset as a change since the last cut", async () => {
    const { courseId } = await seedCourseWithAssets();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const localCoursesRoot = await ensureLocalCoursesRoot();

    const course = (await listCourses(localCoursesRoot)).find((entry) => entry.id === courseId);

    expect(course?.versionBadge).toEqual({ kind: "version", version: cut.version });
  });

  // Title, description, languages and tags live in course.json, so editing
  // only them must count as a change since the last cut.
  it("reports a course.json-only metadata edit as a change since the last cut", async () => {
    const courseId = await seedDraftCourse();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const badge = async () =>
      (await listCourses(localCoursesRoot)).find((entry) => entry.id === courseId)?.versionBadge;

    expect(await badge()).toEqual({ kind: "version", version: cut.version });

    await updateLocalCourseDraftMetadata({
      contentRating: "all-ages",
      courseId,
      defaultLocale: "en",
      descriptiveTags: [],
      locales: { en: { description: "A test course", title: "Renamed Course" } },
      supportedLocales: ["en"],
    });

    expect(await badge()).toEqual({ kind: "draft" });
  });

  it("hardlinks files back into the draft on revert", async () => {
    const { courseId, draftDir, usedAsset } = await seedCourseWithAssets();
    const cut = await cutLocalCourseVersion({ courseId, releaseType: "patch" });
    const versionDir = path.join(path.dirname(draftDir), "versions", cut.version);

    await revertLocalCourseDraftToVersion({ courseId, version: cut.version });

    const draftAssetStat = await fs.stat(path.join(draftDir, "assets", usedAsset));
    const versionAssetStat = await fs.stat(path.join(versionDir, "assets", usedAsset));

    expect(draftAssetStat.ino).toBe(versionAssetStat.ino);
  });
});

// The courses-root setup (seed copy, migrations, crash recovery) runs once per
// root, not on every call: overlapping runs raced each other (EEXIST while two
// seed copies wrote the same folder), and a repeated recovery pass deleted the
// temp folders a cut or revert was still building (SLJ-16).
describe("ensureLocalCoursesRoot", () => {
  it("resolves every overlapping call on a fresh root, with the bundled course seeded", async () => {
    const roots = await Promise.all(Array.from({ length: 8 }, () => ensureLocalCoursesRoot()));

    expect(new Set(roots).size).toBe(1);
    const list = await listCourses(roots[0]);
    expect(list.some((course) => course.distribution === "bundled")).toBe(true);
  });

  it("leaves an in-flight revert's staging folder alone on later calls", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const stagingPath = path.join(localCoursesRoot, courseId, ".draft-staging-123-456");

    await fs.mkdir(stagingPath);
    await ensureLocalCoursesRoot();

    expect(await fs.stat(stagingPath).then(() => true, () => false)).toBe(true);
  });

  it("leaves an in-flight cut's temp version folder alone on later calls", async () => {
    const courseId = await seedDraftCourse();
    const localCoursesRoot = await ensureLocalCoursesRoot();
    const tempVersionPath = path.join(localCoursesRoot, courseId, "versions", "0.1.1.tmp-123-456");

    await fs.mkdir(tempVersionPath, { recursive: true });
    await ensureLocalCoursesRoot();

    expect(await fs.stat(tempVersionPath).then(() => true, () => false)).toBe(true);
  });
});

describe("legacy course id cleanup", () => {
  async function makeLegacyCourse(coursesRoot: string, name: string): Promise<void> {
    await fs.mkdir(path.join(coursesRoot, name, "draft"), { recursive: true });
    await fs.writeFile(path.join(coursesRoot, name, "draft", "course.json"), "{}");
  }

  it("removes slug-id courses once, keeps valid ids, and re-seeds the bundled course", async () => {
    const coursesRoot = path.join(userDataDir, "courses");
    const { courseId: keptCourseId } = await createLocalCourseDraft({
      defaultLocale: "en",
      locales: { en: { description: "", title: "Kept Course" } },
      supportedLocales: ["en"],
    });

    // Simulate an install from before the id change: remove the marker the
    // first call just wrote, then add courses with old-style slug ids.
    await fs.rm(path.join(coursesRoot, ".legacy-course-ids-removed"));
    await makeLegacyCourse(coursesRoot, "polinomi");
    await makeLegacyCourse(coursesRoot, "matko-getting-started");

    forgetLocalCoursesRootSetupForTests(); // the next launch runs the cleanup
    await ensureLocalCoursesRoot();

    const remaining = (await fs.readdir(coursesRoot)).filter((name) => !name.startsWith("."));

    expect(remaining.sort()).toEqual([keptCourseId, "thys2vej6my5mpxt"].sort());
  });

  it("never deletes a folder added after the one-time cleanup ran", async () => {
    const coursesRoot = await ensureLocalCoursesRoot();

    await makeLegacyCourse(coursesRoot, "added-later");
    forgetLocalCoursesRootSetupForTests(); // even on a later launch
    await ensureLocalCoursesRoot();

    expect(await fs.readdir(coursesRoot)).toContain("added-later");
  });
});

describe("course ids", () => {
  it("creates drafts with random 16-character ids and a readable slug", async () => {
    const { courseId } = await createLocalCourseDraft({
      defaultLocale: "en",
      locales: { en: { description: "", title: "Polinomi i funkcije" } },
      supportedLocales: ["en"],
    });
    const coursesRoot = await ensureLocalCoursesRoot();
    const manifest = JSON.parse(
      await fs.readFile(path.join(coursesRoot, courseId, "draft", "course.json"), "utf8"),
    ) as { id: string; slug: string };

    expect(courseId).toMatch(/^[a-z2-7]{16}$/);
    expect(manifest.id).toBe(courseId);
    expect(manifest.slug).toBe("polinomi-i-funkcije");
  });

  it("gives two courses with the same title different ids", async () => {
    const input = {
      defaultLocale: "en" as const,
      locales: { en: { description: "", title: "Same Title" } },
      supportedLocales: ["en" as const],
    };

    const first = await createLocalCourseDraft(input);
    const second = await createLocalCourseDraft(input);

    expect(first.courseId).not.toBe(second.courseId);
  });

  it("rejects malformed ids before touching the filesystem", async () => {
    await expect(
      cutLocalCourseVersion({ courseId: "../../escape", releaseType: "patch" }),
    ).rejects.toThrow(/Invalid course id/);
  });
});

// SLJ-40: an imported course is kept as versions/<v>/ + release.json.
describe("imported courses", () => {
  const source = { driveKey: "drive-key", publisher: { id: "teacher-key" } };
  const expectation = (courseId: string, version: string) => ({
    courseId,
    driveKey: source.driveKey,
    publisherId: source.publisher.id,
    version,
  });

  async function listFiles(directory: string): Promise<string[]> {
    return (await fs.readdir(directory, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)))
      .sort();
  }

  // A teacher's course with two cut versions, then turned into what an import
  // lands as on another device: the first version, root-only, "published",
  // with source.json. Returns the course id and a copy of each version as a
  // stand-in for the drive.
  async function seedImportedCourse(): Promise<{ courseId: string; drive: Record<string, string> }> {
    const courseId = await seedDraftCourse();
    const root = await ensureLocalCoursesRoot();
    const first = await cutLocalCourseVersion({ courseId, releaseType: "minor" });
    const second = await cutLocalCourseVersion({ courseId, releaseType: "minor" });
    const drive: Record<string, string> = {};

    for (const version of [first.version, second.version]) {
      const copy = await fs.mkdtemp(path.join(os.tmpdir(), "matko-drive-"));
      await fs.cp(path.join(root, courseId, "versions", version), copy, { recursive: true });
      // The changed lesson in the newer version, so there's something to download.
      if (version === second.version) {
        const lesson = (await listFiles(copy)).find((file) => file.endsWith(".md"))!;
        await fs.writeFile(path.join(copy, lesson), "Second version.");
      }
      await fs.writeFile(path.join(copy, "source.json"), JSON.stringify(source));
      drive[version] = copy;
    }

    await fs.rm(path.join(root, courseId), { force: true, recursive: true });
    await fs.cp(drive[first.version], path.join(root, courseId), { recursive: true });
    const manifestPath = path.join(root, courseId, "course.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, status: "published" }));

    return { courseId, drive };
  }

  // Like the worker's mirror onto a hardlinked copy: only differing files are
  // written, always as a new file (temp + rename), never in place.
  function mirrorFrom(drivePath: string) {
    return async (stagingPath: string) => {
      const changed: string[] = [];
      for (const file of await listFiles(drivePath)) {
        const next = await fs.readFile(path.join(drivePath, file));
        const target = path.join(stagingPath, file);
        const current = await fs.readFile(target).catch(() => null);
        if (current && current.equals(next)) continue;
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(`${target}.tmp`, next);
        await fs.rename(`${target}.tmp`, target);
        changed.push(file);
      }
      return { changedFiles: changed.map((key) => ({ key, op: "change" })) };
    };
  }

  it("moves a root-only import into versions/<v> with release.json, and the course list reads it", async () => {
    const { courseId } = await seedImportedCourse();
    const root = await ensureLocalCoursesRoot();

    await migrateImportedCourse(courseId);

    expect((await fs.readdir(path.join(root, courseId))).sort()).toEqual(["release.json", "versions"]);
    expect(await readImportedCourseVersion(courseId)).toBe("0.2.0");
    const course = (await listCourses(root)).find((entry) => entry.id === courseId);
    expect(course).toMatchObject({ distribution: "imported", version: "0.2.0" });
  });

  it("finishes a migration interrupted before course.json moved", async () => {
    const { courseId } = await seedImportedCourse();
    const root = await ensureLocalCoursesRoot();
    const courseRoot = path.join(root, courseId);
    // As a crash would leave it: release.json written, some entries moved.
    await fs.mkdir(path.join(courseRoot, "versions", "0.2.0"), { recursive: true });
    await fs.writeFile(path.join(courseRoot, "release.json"), JSON.stringify({ publishedVersion: "0.2.0" }));
    await fs.rename(path.join(courseRoot, "source.json"), path.join(courseRoot, "versions", "0.2.0", "source.json"));

    forgetLocalCoursesRootSetupForTests();
    await ensureLocalCoursesRoot();

    expect((await fs.readdir(courseRoot)).sort()).toEqual(["release.json", "versions"]);
    expect(await listFiles(path.join(courseRoot, "versions", "0.2.0"))).toContain("source.json");
    expect((await listCourses(root)).find((entry) => entry.id === courseId)?.version).toBe("0.2.0");
  });

  it("updates into a new versions/<v>, sharing unchanged files with the previous version", async () => {
    const { courseId, drive } = await seedImportedCourse();
    const root = await ensureLocalCoursesRoot();
    await migrateImportedCourse(courseId);

    const result = await applyImportedCourseUpdate(expectation(courseId, "0.3.0"), mirrorFrom(drive["0.3.0"]));

    // Only what differs is written: the edited lesson and the version's own files.
    const changed = result?.changedFiles.map((file) => file.key) ?? [];
    expect(changed).toHaveLength(4);
    expect(changed).toEqual(
      expect.arrayContaining(["changelog.json", "course.json", "version-meta.json", expect.stringMatching(/\.md$/)]),
    );
    expect(await listImportedCourseVersions(courseId)).toEqual({ current: "0.3.0", versions: ["0.3.0", "0.2.0"] });
    expect((await listCourses(root)).find((entry) => entry.id === courseId)?.version).toBe("0.3.0");

    const versions = path.join(root, courseId, "versions");
    const lesson = (await listFiles(path.join(versions, "0.2.0"))).find((file) => file.endsWith(".md"))!;
    expect(await fs.readFile(path.join(versions, "0.2.0", lesson), "utf8")).not.toBe("Second version.");
    expect(await fs.readFile(path.join(versions, "0.3.0", lesson), "utf8")).toBe("Second version.");

    const sectionFile = (await listFiles(path.join(versions, "0.2.0"))).find(
      (file) => file.startsWith("section-") && file.endsWith(".json"),
    )!;
    const [previous, next] = await Promise.all([
      fs.stat(path.join(versions, "0.2.0", sectionFile)),
      fs.stat(path.join(versions, "0.3.0", sectionFile)),
    ]);
    expect(next.ino).toBe(previous.ino);
  });

  it("goes back without downloading, and returns to a kept version without downloading either", async () => {
    const { courseId, drive } = await seedImportedCourse();
    await migrateImportedCourse(courseId);
    await applyImportedCourseUpdate(expectation(courseId, "0.3.0"), mirrorFrom(drive["0.3.0"]));

    await switchImportedCourseVersion(courseId, "0.2.0");
    expect(await readImportedCourseVersion(courseId)).toBe("0.2.0");

    const download = vi.fn();
    await expect(applyImportedCourseUpdate(expectation(courseId, "0.3.0"), download)).resolves.toBeNull();
    expect(download).not.toHaveBeenCalled();
    expect(await readImportedCourseVersion(courseId)).toBe("0.3.0");

    await expect(switchImportedCourseVersion(courseId, "9.9.9")).rejects.toThrow(/isn't on this device/);
  });

  it("keeps only as many previous versions as the setting allows", async () => {
    const { courseId, drive } = await seedImportedCourse();
    await migrateImportedCourse(courseId);

    await applyImportedCourseUpdate(expectation(courseId, "0.3.0"), mirrorFrom(drive["0.3.0"]), {
      previousToKeep: 0,
    });

    expect(await listImportedCourseVersions(courseId)).toEqual({ current: "0.3.0", versions: ["0.3.0"] });
  });

  it("leaves the course as it was when the download or validation fails", async () => {
    const { courseId, drive } = await seedImportedCourse();
    const root = await ensureLocalCoursesRoot();
    await migrateImportedCourse(courseId);

    await expect(
      applyImportedCourseUpdate(expectation(courseId, "0.3.0"), async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
    await expect(
      applyImportedCourseUpdate({ ...expectation(courseId, "0.3.0"), publisherId: "someone-else" }, mirrorFrom(drive["0.3.0"])),
    ).rejects.toThrow(/different source/);

    expect(await listImportedCourseVersions(courseId)).toEqual({ current: "0.2.0", versions: ["0.2.0"] });
    expect((await fs.readdir(path.join(root, courseId, "versions"))).filter((name) => name.startsWith("."))).toEqual([]);
  });

  it("opens the folder a course is read from: the draft for your own, the version in use for an imported one", async () => {
    const ownCourseId = await seedDraftCourse();
    const { courseId } = await seedImportedCourse();
    const root = await ensureLocalCoursesRoot();
    await migrateImportedCourse(courseId);

    await openCourseDirectoryInFileSystem(ownCourseId);
    await openCourseDirectoryInFileSystem(courseId);

    expect(vi.mocked(shell.openPath).mock.calls.map(([target]) => target)).toEqual([
      path.join(root, ownCourseId, "draft"),
      path.join(root, courseId, "versions", "0.2.0"),
    ]);
  });

  it("removes an update's staging folder left by a crash", async () => {
    const { courseId } = await seedImportedCourse();
    const root = await ensureLocalCoursesRoot();
    await migrateImportedCourse(courseId);
    const staging = path.join(root, courseId, "versions", ".staging-0.3.0-1-abcd");
    await fs.mkdir(staging, { recursive: true });

    await cleanUpInterruptedCourseUpdates();

    expect(await fs.stat(staging).then(() => true, () => false)).toBe(false);
  });
});
