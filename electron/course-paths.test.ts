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
  forgetLocalCoursesRootSetupForTests,
  getUnusedDraftAssets,
  hashFileContents,
  publishLocalCourseVersion,
  revertLocalCourseDraftToVersion,
  updateLocalCourseDraftMetadata,
  uploadCourseAssetFromBytes,
} from "./course-paths";
import { getCourseVersionHistory, listCourses } from "./course-registry";

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
