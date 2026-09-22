import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { app, dialog } from "electron";
import type {
  ApplyCourseSvgPresetInput,
  ApplyCourseSvgPresetResult,
  ContentRating,
  CreateCourseDraftInput,
  CreateCourseLessonInput,
  CreateCourseSectionInput,
  CreateCourseSectionTestInput,
  CourseStatus,
  CourseManifest,
  CutCourseVersionInput,
  CutCourseVersionResult,
  DeleteCourseLessonInput,
  DeleteCourseSectionInput,
  DeleteCourseSectionTestInput,
  GetLessonTestDraftInput,
  GetSectionTestDraftInput,
  PublishCourseVersionInput,
  RevertCourseDraftInput,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
  UpdateCourseDraftMetadataInput,
  UpdateLessonContentInput,
  UploadCourseAssetInput,
  UploadCourseAssetResult,
} from "../src/lib/course-package";
import {
  assetExtensionsByKind,
  assetMimeTypesByExtension,
  createAssetFilename,
} from "../src/lib/course-asset-id";
import { regionPickerSvgPresets } from "../src/lib/region-picker-svg-presets";
import { assertCoursePackageIsPublishable, isSharedTestDefinition } from "./course-registry";
import { resolveTestIdForLesson } from "../src/lib/course-test-id";
import { locales, type Locale } from "../src/lib/i18n";
import {
  bumpCourseVersion,
  compareCourseVersions,
  createInitialCourseVersion,
  formatCourseVersion,
  parseCourseVersion,
  type CourseVersionReleaseType,
} from "../src/lib/course-versioning";
import { slugifyCourseName } from "../src/lib/course-slug";
import { transliterateSerbianLatinToCyrillic } from "../src/lib/serbian-transliteration";

const bundledSeedCourseIds = ["matko-getting-started"] as const;
const bundledSeedCourseIdSet = new Set<string>(bundledSeedCourseIds);

type BundledSeedState = {
  removedCourseIds: string[];
};

function normalizeContentRating(value: unknown): ContentRating {
  if (
    value === "all-ages" ||
    value === "mature-themes" ||
    value === "explicit"
  ) {
    return value;
  }

  return "all-ages";
}

function getBundledCoursesRoot(): string {
  return path.join(process.env.APP_ROOT, "courses");
}

// Mirrors `getBundledCoursesRoot` — bundled, read-only source files shipped
// alongside the app, copied into a course's own `assets/` directory on
// selection so the resulting course stays self-contained (see
// `applyCourseSvgPreset` below).
function getBundledSvgPresetPath(presetId: string): string {
  const preset = regionPickerSvgPresets.find((candidate) => candidate.id === presetId);

  if (!preset) {
    throw new Error(`Unknown SVG preset "${presetId}"`);
  }

  return path.join(process.env.APP_ROOT, "presets", "region-picker", preset.filename);
}

export function getLocalCoursesRoot(): string {
  return path.join(app.getPath("userData"), "courses");
}

function getBundledSeedStatePath(localCoursesRoot: string): string {
  return path.join(localCoursesRoot, ".bundled-seed-state.json");
}

function getDraftDirectoryPath(courseRootPath: string): string {
  return path.join(courseRootPath, "draft");
}

async function readBundledSeedState(
  localCoursesRoot: string,
): Promise<BundledSeedState> {
  try {
    const rawState = await fs.readFile(
      getBundledSeedStatePath(localCoursesRoot),
      "utf8",
    );
    const parsedState = JSON.parse(rawState) as Partial<BundledSeedState>;

    return {
      removedCourseIds: Array.isArray(parsedState.removedCourseIds)
        ? parsedState.removedCourseIds.filter(
            (courseId): courseId is string => typeof courseId === "string",
          )
        : [],
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return { removedCourseIds: [] };
    }

    throw error;
  }
}

async function writeBundledSeedState(
  localCoursesRoot: string,
  state: BundledSeedState,
): Promise<void> {
  await fs.writeFile(
    getBundledSeedStatePath(localCoursesRoot),
    JSON.stringify(state, null, 2),
  );
}

export async function ensureLocalCoursesRoot(): Promise<string> {
  const localCoursesRoot = getLocalCoursesRoot();

  await fs.mkdir(localCoursesRoot, { recursive: true });

  try {
    const bundledCoursesRoot = getBundledCoursesRoot();
    const bundledSeedState = await readBundledSeedState(localCoursesRoot);
    const removedCourseIds = new Set(bundledSeedState.removedCourseIds);

    await Promise.all(
      bundledSeedCourseIds.map(async (courseId) => {
        if (removedCourseIds.has(courseId)) {
          return;
        }

        const sourcePath = path.join(bundledCoursesRoot, courseId);
        const targetPath = path.join(localCoursesRoot, courseId);

        await fs.cp(sourcePath, targetPath, {
          errorOnExist: false,
          force: true,
          recursive: true,
        });
      }),
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  await migrateNonBundledCoursesToDrafts(localCoursesRoot);
  await recoverInterruptedDraftReplacements(localCoursesRoot);

  return localCoursesRoot;
}

export async function removeLocalCourse(courseId: string): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = path.join(localCoursesRoot, courseId);
  const resolvedCourseRootPath = path.resolve(courseRootPath);
  const relativeToCoursesRoot = path.relative(
    localCoursesRoot,
    resolvedCourseRootPath,
  );

  if (
    relativeToCoursesRoot.startsWith("..") ||
    path.isAbsolute(relativeToCoursesRoot)
  ) {
    throw new Error(`Invalid course id "${courseId}"`);
  }

  await fs.rm(resolvedCourseRootPath, {
    force: true,
    recursive: true,
  });

  if (bundledSeedCourseIdSet.has(courseId)) {
    const bundledSeedState = await readBundledSeedState(localCoursesRoot);

    if (!bundledSeedState.removedCourseIds.includes(courseId)) {
      bundledSeedState.removedCourseIds.push(courseId);
      bundledSeedState.removedCourseIds.sort();
      await writeBundledSeedState(localCoursesRoot, bundledSeedState);
    }
  }
}

async function resolveUniqueCourseId(
  localCoursesRoot: string,
  baseId: string,
): Promise<string> {
  let candidateId = baseId;
  let suffix = 2;
  let isUnique = false;

  while (!isUnique) {
    try {
      await fs.access(path.join(localCoursesRoot, candidateId));
      candidateId = `${baseId}-${suffix}`;
      suffix += 1;
    } catch {
      isUnique = true;
    }
  }

  return candidateId;
}

function resolveCourseDirectoryPath(
  localCoursesRoot: string,
  courseId: string,
): string {
  const courseDirectoryPath = getDraftDirectoryPath(path.join(localCoursesRoot, courseId));
  const resolvedCourseDirectoryPath = path.resolve(courseDirectoryPath);
  const relativeToCoursesRoot = path.relative(
    localCoursesRoot,
    resolvedCourseDirectoryPath,
  );

  if (
    relativeToCoursesRoot.startsWith("..") ||
    path.isAbsolute(relativeToCoursesRoot)
  ) {
    throw new Error(`Invalid course id "${courseId}"`);
  }

  return resolvedCourseDirectoryPath;
}

function resolveCourseRootPath(localCoursesRoot: string, courseId: string): string {
  const courseRootPath = path.join(localCoursesRoot, courseId);
  const resolvedCourseRootPath = path.resolve(courseRootPath);
  const relativeToCoursesRoot = path.relative(localCoursesRoot, resolvedCourseRootPath);

  if (
    relativeToCoursesRoot.startsWith("..") ||
    path.isAbsolute(relativeToCoursesRoot)
  ) {
    throw new Error(`Invalid course id "${courseId}"`);
  }

  return resolvedCourseRootPath;
}

async function writeFileAtomic(targetPath: string, contents: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;

  await fs.writeFile(tmpPath, contents);
  await fs.rename(tmpPath, targetPath);
}

async function copyFileAtomic(sourcePath: string, targetPath: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;

  await fs.copyFile(sourcePath, tmpPath);
  await fs.rename(tmpPath, targetPath);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function listFilesRecursively(rootPath: string): Promise<string[]> {
  const directoryEntries = await fs.readdir(rootPath, { withFileTypes: true });

  const nestedFilePaths = await Promise.all(
    directoryEntries.map(async (entry) => {
      const entryPath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        return listFilesRecursively(entryPath);
      }

      return [entryPath];
    }),
  );

  return nestedFilePaths.flat();
}

export async function hashFileContents(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath);

  return crypto.createHash("sha256").update(contents).digest("hex");
}

/**
 * Populates a fresh `targetDirectoryPath` with the contents of
 * `sourceDirectoryPath`. When `previousSnapshot` is given and a file's
 * content hash matches the hash stored for the same relative path in that
 * snapshot, the file is hardlinked from the snapshot instead of copied — safe
 * here specifically because every write in this codebase goes through
 * temp-file-then-rename rather than in-place mutation, so two directories can
 * share an inode without one edit ever corrupting the other. Falls back to a
 * real copy for new/changed files, and whenever `fs.link` fails (e.g.
 * `EXDEV` — source and target on different filesystems).
 *
 * Does not create or rename `targetDirectoryPath` itself beyond `mkdir` —
 * atomicity is the caller's responsibility (stage into a temp-named
 * directory, then a single `fs.rename` into place), since callers need to
 * add further files (an updated manifest, version metadata) before
 * committing.
 */
export async function copyDirectoryWithDedup(
  sourceDirectoryPath: string,
  targetDirectoryPath: string,
  previousSnapshot: { directoryPath: string; fileHashes: Record<string, string> } | null,
): Promise<Record<string, string>> {
  await fs.mkdir(targetDirectoryPath, { recursive: true });

  const sourceFilePaths = await listFilesRecursively(sourceDirectoryPath);
  const nextFileHashes: Record<string, string> = {};

  await Promise.all(
    sourceFilePaths.map(async (sourceFilePath) => {
      const relativeFilePath = path.relative(sourceDirectoryPath, sourceFilePath);
      const targetFilePath = path.join(targetDirectoryPath, relativeFilePath);
      const contentHash = await hashFileContents(sourceFilePath);

      nextFileHashes[relativeFilePath] = contentHash;

      await fs.mkdir(path.dirname(targetFilePath), { recursive: true });

      const previousHash = previousSnapshot?.fileHashes[relativeFilePath];

      if (previousSnapshot && previousHash === contentHash) {
        try {
          await fs.link(
            path.join(previousSnapshot.directoryPath, relativeFilePath),
            targetFilePath,
          );
          return;
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;

          if (nodeError.code !== "EXDEV" && nodeError.code !== "ENOENT") {
            throw error;
          }
          // Fall through to a real copy below.
        }
      }

      await fs.copyFile(sourceFilePath, targetFilePath);
    }),
  );

  return nextFileHashes;
}

type CourseReleaseState = {
  everPublishedVersions: string[];
  publishedAt: string | null;
  publishedVersion: string | null;
};

function getReleaseStatePath(courseRootPath: string): string {
  return path.join(courseRootPath, "release.json");
}

async function readCourseReleaseState(courseRootPath: string): Promise<CourseReleaseState> {
  try {
    const rawState = await fs.readFile(getReleaseStatePath(courseRootPath), "utf8");
    const parsedState = JSON.parse(rawState) as Partial<CourseReleaseState>;

    return {
      everPublishedVersions: Array.isArray(parsedState.everPublishedVersions)
        ? parsedState.everPublishedVersions.filter(
            (version): version is string => typeof version === "string",
          )
        : [],
      publishedAt: typeof parsedState.publishedAt === "string" ? parsedState.publishedAt : null,
      publishedVersion:
        typeof parsedState.publishedVersion === "string" ? parsedState.publishedVersion : null,
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return { everPublishedVersions: [], publishedAt: null, publishedVersion: null };
    }

    throw error;
  }
}

async function writeCourseReleaseState(
  courseRootPath: string,
  state: CourseReleaseState,
): Promise<void> {
  await writeFileAtomic(getReleaseStatePath(courseRootPath), JSON.stringify(state, null, 2));
}

type CourseVersionMeta = {
  cutAt: string;
  fileHashes: Record<string, string>;
  releaseType: CourseVersionReleaseType;
};

function isCourseVersionReleaseTypeValue(value: unknown): value is CourseVersionReleaseType {
  return value === "initial" || value === "major" || value === "minor" || value === "patch";
}

function getVersionMetaPath(versionDirectoryPath: string): string {
  return path.join(versionDirectoryPath, "version-meta.json");
}

async function readCourseVersionMeta(
  versionDirectoryPath: string,
): Promise<CourseVersionMeta | null> {
  try {
    const rawMeta = await fs.readFile(getVersionMetaPath(versionDirectoryPath), "utf8");
    const parsedMeta = JSON.parse(rawMeta) as Partial<CourseVersionMeta>;

    return {
      cutAt: typeof parsedMeta.cutAt === "string" ? parsedMeta.cutAt : "",
      fileHashes:
        parsedMeta.fileHashes && typeof parsedMeta.fileHashes === "object"
          ? (parsedMeta.fileHashes as Record<string, string>)
          : {},
      releaseType: isCourseVersionReleaseTypeValue(parsedMeta.releaseType)
        ? parsedMeta.releaseType
        : "patch",
    };
  } catch {
    return null;
  }
}

export async function findMostRecentSnapshot(
  versionsDirectoryPath: string,
): Promise<{ directoryPath: string; fileHashes: Record<string, string> } | null> {
  let versionDirectoryNames: string[];

  try {
    const directoryEntries = await fs.readdir(versionsDirectoryPath, { withFileTypes: true });
    versionDirectoryNames = directoryEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return null;
  }

  if (versionDirectoryNames.length === 0) {
    return null;
  }

  const sortedVersionNames = versionDirectoryNames
    .map((name) => ({ name, versionInfo: parseCourseVersion(name) }))
    .sort((left, right) => compareCourseVersions(right.versionInfo, left.versionInfo));
  const mostRecentDirectoryPath = path.join(versionsDirectoryPath, sortedVersionNames[0].name);
  const meta = await readCourseVersionMeta(mostRecentDirectoryPath);

  return { directoryPath: mostRecentDirectoryPath, fileHashes: meta?.fileHashes ?? {} };
}

/**
 * Self-heals a `draft/` directory left in an inconsistent state by a process
 * that died mid-`revertLocalCourseDraftToVersion` — same "best-effort repair
 * on load" idiom as `migrateNonBundledCoursesToDrafts`. Called from
 * `ensureLocalCoursesRoot()` on every launch.
 */
async function recoverInterruptedDraftReplacements(localCoursesRoot: string): Promise<void> {
  const directoryEntries = await fs.readdir(localCoursesRoot, { withFileTypes: true });

  await Promise.all(
    directoryEntries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map(async (entry) => {
        const courseRootPath = path.join(localCoursesRoot, entry.name);
        let courseRootEntries;

        try {
          courseRootEntries = await fs.readdir(courseRootPath, { withFileTypes: true });
        } catch {
          return;
        }

        const draftExists = courseRootEntries.some(
          (childEntry) => childEntry.isDirectory() && childEntry.name === "draft",
        );
        const stagingDirectories = courseRootEntries.filter(
          (childEntry) => childEntry.isDirectory() && childEntry.name.startsWith(".draft-staging-"),
        );
        const garbageDirectories = courseRootEntries.filter(
          (childEntry) =>
            childEntry.isDirectory() &&
            (childEntry.name.startsWith(".draft-retired-") || childEntry.name.includes(".tmp-")),
        );

        if (!draftExists && stagingDirectories.length > 0) {
          await fs.rename(
            path.join(courseRootPath, stagingDirectories[0].name),
            path.join(courseRootPath, "draft"),
          );
        } else if (draftExists && stagingDirectories.length > 0) {
          await Promise.all(
            stagingDirectories.map((stagingEntry) =>
              fs.rm(path.join(courseRootPath, stagingEntry.name), {
                force: true,
                recursive: true,
              }),
            ),
          );
        }

        await Promise.all(
          garbageDirectories.map((garbageEntry) =>
            fs.rm(path.join(courseRootPath, garbageEntry.name), {
              force: true,
              recursive: true,
            }),
          ),
        );

        const versionsDirectoryPath = path.join(courseRootPath, "versions");

        try {
          const versionEntries = await fs.readdir(versionsDirectoryPath, {
            withFileTypes: true,
          });

          await Promise.all(
            versionEntries
              .filter((versionEntry) => versionEntry.isDirectory() && versionEntry.name.includes(".tmp-"))
              .map((versionEntry) =>
                fs.rm(path.join(versionsDirectoryPath, versionEntry.name), {
                  force: true,
                  recursive: true,
                }),
              ),
          );
        } catch {
          // No versions/ directory yet — nothing to clean up.
        }
      }),
  );
}

function resolveSectionDirectoryPath(
  courseDirectoryPath: string,
  sectionId: string,
): string {
  const sectionDirectoryPath = path.join(courseDirectoryPath, sectionId);
  const resolvedSectionDirectoryPath = path.resolve(sectionDirectoryPath);
  const relativeToCourseDirectory = path.relative(
    courseDirectoryPath,
    resolvedSectionDirectoryPath,
  );

  if (
    relativeToCourseDirectory.startsWith("..") ||
    path.isAbsolute(relativeToCourseDirectory)
  ) {
    throw new Error(`Invalid section id "${sectionId}"`);
  }

  return resolvedSectionDirectoryPath;
}

async function readCourseManifest(
  courseDirectoryPath: string,
): Promise<CourseManifest> {
  const fileContents = await fs.readFile(
    path.join(courseDirectoryPath, "course.json"),
    "utf8",
  );

  return JSON.parse(fileContents) as CourseManifest;
}

async function writeCourseManifest(
  courseDirectoryPath: string,
  manifest: CourseManifest & Record<string, unknown>,
): Promise<void> {
  await writeFileAtomic(
    path.join(courseDirectoryPath, "course.json"),
    JSON.stringify(manifest, null, 2),
  );
}

async function migrateNonBundledCoursesToDrafts(
  localCoursesRoot: string,
): Promise<void> {
  const directoryEntries = await fs.readdir(localCoursesRoot, {
    withFileTypes: true,
  });

  await Promise.all(
    directoryEntries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        if (bundledSeedCourseIdSet.has(entry.name)) {
          return;
        }

        const courseRootPath = path.join(localCoursesRoot, entry.name);
        const draftDirectoryPath = getDraftDirectoryPath(courseRootPath);

        try {
          await fs.access(draftDirectoryPath);
        } catch {
          const courseRootEntries = await fs.readdir(courseRootPath, {
            withFileTypes: true,
          });

          if (!courseRootEntries.some((childEntry) => childEntry.name === "course.json")) {
            return;
          }

          // A course sitting at its root with no draft/ isn't always pre-migration
          // legacy content: a P2P import lands the same way (root course.json, no
          // draft/), deliberately, matching how the bundled seed course already
          // works. Only migrate genuinely unmigrated content — anything already
          // marked published stays exactly where it is.
          try {
            const rootManifest = await readCourseManifest(courseRootPath);

            if (rootManifest.status === "published") {
              return;
            }
          } catch {
            return;
          }

          await fs.mkdir(draftDirectoryPath, { recursive: true });

          await Promise.all(
            courseRootEntries
              .filter((childEntry) => !childEntry.name.startsWith("."))
              .map(async (childEntry) => {
                const sourcePath = path.join(courseRootPath, childEntry.name);
                const targetPath = path.join(draftDirectoryPath, childEntry.name);

                await fs.rename(sourcePath, targetPath);
              }),
          );
        }

        try {
          const manifest = await readCourseManifest(draftDirectoryPath);

          if (manifest.status === "draft") {
            return;
          }

          await writeCourseManifest(draftDirectoryPath, {
            ...manifest,
            status: "draft",
          });
        } catch {
          return;
        }
      }),
  );
}

async function resolveNextSectionId(courseDirectoryPath: string, title: string) {
  const directoryEntries = await fs.readdir(courseDirectoryPath, {
    withFileTypes: true,
  });
  const sectionIndexes = directoryEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.match(/^section-(\d{2})-[a-z0-9-]+$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number.parseInt(match[1], 10))
    .sort((left, right) => left - right);
  const nextIndex = (sectionIndexes.at(-1) ?? 0) + 1;
  const slug = slugifyCourseName(title) || "untitled-section";

  return `section-${String(nextIndex).padStart(2, "0")}-${slug}`;
}

async function readStoredLocalizedTitle(
  filePath: string,
  locale: Locale,
): Promise<string | null> {
  try {
    const fileContents = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContents) as {
      locales?: Record<string, { title?: string }>;
    };

    return parsed.locales?.[locale]?.title ?? null;
  } catch {
    return null;
  }
}

function normalizeTitleForComparison(title: string): string {
  return title.trim().toLowerCase();
}

async function hasSiblingSectionWithTitle(
  courseDirectoryPath: string,
  defaultLocale: Locale,
  title: string,
): Promise<boolean> {
  const directoryEntries = await fs.readdir(courseDirectoryPath, {
    withFileTypes: true,
  });
  const sectionJsonPaths = directoryEntries
    .filter(
      (entry) => entry.isDirectory() && /^section-\d{2}-[a-z0-9-]+$/.test(entry.name),
    )
    .map((entry) => path.join(courseDirectoryPath, entry.name, "section.json"));
  const titles = await Promise.all(
    sectionJsonPaths.map((filePath) => readStoredLocalizedTitle(filePath, defaultLocale)),
  );
  const normalizedTarget = normalizeTitleForComparison(title);

  return titles.some(
    (existingTitle) =>
      existingTitle !== null &&
      normalizeTitleForComparison(existingTitle) === normalizedTarget,
  );
}

async function hasSiblingLessonWithTitle(
  sectionDirectoryPath: string,
  defaultLocale: Locale,
  title: string,
): Promise<boolean> {
  const directoryEntries = await fs.readdir(sectionDirectoryPath, {
    withFileTypes: true,
  });
  const lessonJsonPaths = directoryEntries
    .filter(
      (entry) => entry.isFile() && /^lesson-\d{2}-[a-z0-9-]+\.json$/.test(entry.name),
    )
    .map((entry) => path.join(sectionDirectoryPath, entry.name));
  const titles = await Promise.all(
    lessonJsonPaths.map((filePath) => readStoredLocalizedTitle(filePath, defaultLocale)),
  );
  const normalizedTarget = normalizeTitleForComparison(title);

  return titles.some(
    (existingTitle) =>
      existingTitle !== null &&
      normalizeTitleForComparison(existingTitle) === normalizedTarget,
  );
}

async function resolveNextLessonId(sectionDirectoryPath: string, title: string) {
  const directoryEntries = await fs.readdir(sectionDirectoryPath, {
    withFileTypes: true,
  });
  const lessonIndexes = directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name.match(/^lesson-(\d{2})-[a-z0-9-]+\.json$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number.parseInt(match[1], 10))
    .sort((left, right) => left - right);
  const nextIndex = (lessonIndexes.at(-1) ?? 0) + 1;
  const slug = slugifyCourseName(title) || "untitled-lesson";

  return `lesson-${String(nextIndex).padStart(2, "0")}-${slug}`;
}

async function hasSiblingSectionTestWithTitle(
  sectionDirectoryPath: string,
  defaultLocale: Locale,
  title: string,
): Promise<boolean> {
  const directoryEntries = await fs.readdir(sectionDirectoryPath, {
    withFileTypes: true,
  });
  const sectionTestJsonPaths = directoryEntries
    .filter(
      (entry) =>
        entry.isFile() && /^section-test-\d{2}-[a-z0-9-]+\.json$/.test(entry.name),
    )
    .map((entry) => path.join(sectionDirectoryPath, entry.name));
  const titles = await Promise.all(
    sectionTestJsonPaths.map((filePath) =>
      readStoredLocalizedTitle(filePath, defaultLocale),
    ),
  );
  const normalizedTarget = normalizeTitleForComparison(title);

  return titles.some(
    (existingTitle) =>
      existingTitle !== null &&
      normalizeTitleForComparison(existingTitle) === normalizedTarget,
  );
}

async function resolveNextSectionTestId(sectionDirectoryPath: string, title: string) {
  const directoryEntries = await fs.readdir(sectionDirectoryPath, {
    withFileTypes: true,
  });
  const testIndexes = directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name.match(/^section-test-(\d{2})-[a-z0-9-]+\.json$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number.parseInt(match[1], 10))
    .sort((left, right) => left - right);
  const nextIndex = (testIndexes.at(-1) ?? 0) + 1;
  const slug = slugifyCourseName(title) || "untitled-test";

  return `section-test-${String(nextIndex).padStart(2, "0")}-${slug}`;
}

function normalizeSupportedLocales(
  defaultLocale: Locale,
  supportedLocales: Locale[],
): Locale[] {
  const localeSet = new Set<Locale>([defaultLocale]);

  for (const locale of supportedLocales) {
    if (locales.includes(locale)) {
      localeSet.add(locale);
    }
  }

  return locales.filter((locale) => localeSet.has(locale));
}

function resolveCourseStatus(): CourseStatus {
  return "draft";
}

function resolveLocaleSource(
  locale: Locale,
  supportedLocales: Locale[],
  deriveSrCyrlFromSr?: boolean,
): Locale {
  if (
    locale === "sr-Cyrl" &&
    deriveSrCyrlFromSr === true &&
    supportedLocales.includes("sr")
  ) {
    return "sr";
  }

  return locale;
}

export async function createLocalCourseDraft(
  input: CreateCourseDraftInput,
): Promise<{ courseId: string }> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const supportedLocales = normalizeSupportedLocales(
    input.defaultLocale,
    input.deriveSrCyrlFromSr && input.supportedLocales.includes("sr")
      ? [...input.supportedLocales, "sr-Cyrl"]
      : input.supportedLocales,
  );
  const normalizedLocales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const sourceLocale = resolveLocaleSource(
        locale,
        supportedLocales,
        input.deriveSrCyrlFromSr,
      );

      if (sourceLocale === "sr" && locale === "sr-Cyrl" && input.locales.sr) {
        return [
          locale,
          {
            title: transliterateSerbianLatinToCyrillic(
              input.locales.sr.title.trim(),
            ),
            description: transliterateSerbianLatinToCyrillic(
              input.locales.sr.description.trim(),
            ),
          },
        ]
      }

      return [
        locale,
        {
          title: input.locales[locale]?.title.trim() ?? "",
          description: input.locales[locale]?.description.trim() ?? "",
        },
      ]
    }),
  ) as CreateCourseDraftInput["locales"];
  const normalizedTitle = normalizedLocales[input.defaultLocale]?.title ?? "";
  const slugBase = slugifyCourseName(normalizedTitle) || "untitled-course";
  const courseId = await resolveUniqueCourseId(localCoursesRoot, slugBase);
  const courseRootPath = path.join(localCoursesRoot, courseId);
  const courseDirectoryPath = getDraftDirectoryPath(courseRootPath);
  const nowIso = new Date().toISOString();
  const versionInfo = createInitialCourseVersion();

  await fs.mkdir(courseDirectoryPath, { recursive: true });

  await fs.writeFile(
    path.join(courseDirectoryPath, "course.json"),
    JSON.stringify(
      {
        courseSchemaVersion: "1",
        id: courseId,
        version: formatCourseVersion(versionInfo),
        versionInfo,
        defaultLocale: input.defaultLocale,
        contentRating: normalizeContentRating(input.contentRating),
        supportedLocales,
        builtin: false,
        slug: courseId,
        status: resolveCourseStatus(),
        minAppVersion: "0.1.0",
        createdAt: nowIso,
        updatedAt: nowIso,
        publisher: {
          id: slugifyCourseName(app.getName()) || "matko",
          displayName: app.getName(),
        },
        distribution: "local",
        isSeededOnFirstRun: false,
        locales: normalizedLocales,
      },
      null,
      2,
    ),
  );

  return { courseId };
}

export async function createLocalCourseSection(
  input: CreateCourseSectionInput,
): Promise<{ sectionId: string }> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const normalizedTitle = input.title.trim();
  const normalizedDescription = input.description?.trim() ?? "";

  if (!normalizedTitle) {
    throw new Error("Section title is required");
  }

  if (
    await hasSiblingSectionWithTitle(
      courseDirectoryPath,
      manifest.defaultLocale,
      normalizedTitle,
    )
  ) {
    throw new Error(`A section titled "${normalizedTitle}" already exists`);
  }

  const sectionId = await resolveNextSectionId(courseDirectoryPath, normalizedTitle);
  const sectionDirectoryPath = path.join(courseDirectoryPath, sectionId);
  const defaultLocale = manifest.defaultLocale;
  const localizedSectionMetadata = Object.fromEntries(
    manifest.supportedLocales.map((locale) => [
      locale,
      {
        title: normalizedTitle,
        description:
          locale === defaultLocale ? normalizedDescription : "",
      },
    ]),
  );
  const nowIso = new Date().toISOString();

  await fs.mkdir(sectionDirectoryPath, { recursive: true });
  await fs.writeFile(
    path.join(sectionDirectoryPath, "section.json"),
    JSON.stringify(
      {
        id: sectionId,
        slug: sectionId.replace(/^section-\d{2}-/, ""),
        locales: localizedSectionMetadata,
      },
      null,
      2,
    ),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: nowIso,
  });

  return { sectionId };
}

export async function createLocalCourseLesson(
  input: CreateCourseLessonInput,
): Promise<{ lessonId: string }> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );

  try {
    await fs.access(path.join(sectionDirectoryPath, "section.json"));
  } catch {
    throw new Error(`Section "${input.sectionId}" does not exist`);
  }

  const normalizedTitle = input.title.trim();
  const normalizedDescription = input.description?.trim() ?? "";

  if (!normalizedTitle) {
    throw new Error("Lesson title is required");
  }

  if (
    await hasSiblingLessonWithTitle(
      sectionDirectoryPath,
      manifest.defaultLocale,
      normalizedTitle,
    )
  ) {
    throw new Error(
      `A document titled "${normalizedTitle}" already exists in this section`,
    );
  }

  const lessonId = await resolveNextLessonId(sectionDirectoryPath, normalizedTitle);
  const defaultLocale = manifest.defaultLocale;
  const localizedLessonMetadata = Object.fromEntries(
    manifest.supportedLocales.map((locale) => [
      locale,
      {
        title: normalizedTitle,
        description:
          locale === defaultLocale ? normalizedDescription : "",
      },
    ]),
  );
  const nowIso = new Date().toISOString();

  await writeFileAtomic(
    path.join(sectionDirectoryPath, `${lessonId}.json`),
    JSON.stringify(
      {
        id: lessonId,
        slug: lessonId.replace(/^lesson-\d{2}-/, ""),
        locales: localizedLessonMetadata,
      },
      null,
      2,
    ),
  );

  await Promise.all(
    manifest.supportedLocales.map(async (locale) => {
      const localeDirectoryPath = path.join(sectionDirectoryPath, "locales", locale);

      await fs.mkdir(localeDirectoryPath, { recursive: true });
      await writeFileAtomic(path.join(localeDirectoryPath, `${lessonId}.md`), "");
    }),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: nowIso,
  });

  return { lessonId };
}

export async function updateLocalCourseLessonContent(
  input: UpdateLessonContentInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );
  const lessonDefinitionPath = path.join(sectionDirectoryPath, `${input.lessonId}.json`);

  try {
    await fs.access(lessonDefinitionPath);
  } catch {
    throw new Error(`Lesson "${input.lessonId}" does not exist`);
  }

  const localeEntries = Object.entries(input.locales) as [
    Locale,
    { body: string } | undefined,
  ][];

  await Promise.all(
    localeEntries.map(async ([locale, localeContent]) => {
      if (!localeContent) {
        return;
      }

      const localeDirectoryPath = path.join(sectionDirectoryPath, "locales", locale);

      await fs.mkdir(localeDirectoryPath, { recursive: true });
      await writeFileAtomic(
        path.join(localeDirectoryPath, `${input.lessonId}.md`),
        localeContent.body,
      );
    }),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateLocalCourseLessonTest(
  input: SaveLessonTestInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );

  try {
    await fs.access(path.join(sectionDirectoryPath, `${input.lessonId}.json`));
  } catch {
    throw new Error(`Lesson "${input.lessonId}" does not exist`);
  }

  if (!isSharedTestDefinition(input.test)) {
    throw new Error("Test data is invalid");
  }

  const testId = resolveTestIdForLesson(input.lessonId);

  await writeFileAtomic(
    path.join(sectionDirectoryPath, `${testId}.json`),
    JSON.stringify(input.test, null, 2),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

export async function getLocalCourseLessonTestDraft(
  input: GetLessonTestDraftInput,
): Promise<SharedTestDefinition | null> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );
  const testId = resolveTestIdForLesson(input.lessonId);
  const testDefinitionPath = path.join(sectionDirectoryPath, `${testId}.json`);

  let fileContents: string;

  try {
    fileContents = await fs.readFile(testDefinitionPath, "utf8");
  } catch {
    return null;
  }

  const parsedValue = JSON.parse(fileContents) as unknown;

  if (!isSharedTestDefinition(parsedValue)) {
    throw new Error(`Invalid JSON structure in ${testDefinitionPath}`);
  }

  return parsedValue;
}

export async function createLocalCourseSectionTest(
  input: CreateCourseSectionTestInput,
): Promise<{ testId: string }> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );

  try {
    await fs.access(path.join(sectionDirectoryPath, "section.json"));
  } catch {
    throw new Error(`Section "${input.sectionId}" does not exist`);
  }

  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("Test title is required");
  }

  if (
    await hasSiblingSectionTestWithTitle(
      sectionDirectoryPath,
      manifest.defaultLocale,
      normalizedTitle,
    )
  ) {
    throw new Error(
      `A test titled "${normalizedTitle}" already exists in this section`,
    );
  }

  const testId = await resolveNextSectionTestId(sectionDirectoryPath, normalizedTitle);
  const localizedTestMetadata = Object.fromEntries(
    manifest.supportedLocales.map((locale) => [
      locale,
      { description: "", title: normalizedTitle },
    ]),
  );

  // No content fields (`template`/`exercises`) yet — this file exists purely
  // so the explorer tree has something to select before the author has saved
  // a single exercise, mirroring how a lesson's own `.json` exists before its
  // body/test do. See `getLocalCourseSectionTestDraft`'s comment for the
  // resulting read-side difference from a lesson-attached test.
  await writeFileAtomic(
    path.join(sectionDirectoryPath, `${testId}.json`),
    JSON.stringify(
      {
        id: testId,
        slug: testId.replace(/^section-test-\d{2}-/, ""),
        locales: localizedTestMetadata,
      },
      null,
      2,
    ),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });

  return { testId };
}

export async function updateLocalCourseSectionTest(
  input: SaveSectionTestInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );
  const testDefinitionPath = path.join(sectionDirectoryPath, `${input.testId}.json`);

  let existingFileContents: string;

  try {
    existingFileContents = await fs.readFile(testDefinitionPath, "utf8");
  } catch {
    throw new Error(`Test "${input.testId}" does not exist`);
  }

  if (!isSharedTestDefinition(input.test)) {
    throw new Error("Test data is invalid");
  }

  // Unlike a lesson-attached test file (only ever content, no identity), a
  // standalone test's file also carries its id/slug/locales — preserve them,
  // only replacing the content fields.
  const existingIdentity = JSON.parse(existingFileContents) as {
    id: string;
    locales: unknown;
    slug: string;
  };

  await writeFileAtomic(
    testDefinitionPath,
    JSON.stringify(
      {
        id: existingIdentity.id,
        slug: existingIdentity.slug,
        locales: existingIdentity.locales,
        ...input.test,
      },
      null,
      2,
    ),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

export async function getLocalCourseSectionTestDraft(
  input: GetSectionTestDraftInput,
): Promise<SharedTestDefinition | null> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );
  const testDefinitionPath = path.join(sectionDirectoryPath, `${input.testId}.json`);

  let fileContents: string;

  try {
    fileContents = await fs.readFile(testDefinitionPath, "utf8");
  } catch {
    return null;
  }

  const parsedValue = JSON.parse(fileContents) as unknown;

  // A standalone test's file exists as soon as it's created (holding just its
  // title), before any content is saved — unlike a lesson-attached test file,
  // whose mere existence already implies valid content. So a shape mismatch
  // here means "no exercises saved yet," not corruption.
  if (!isSharedTestDefinition(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export async function deleteLocalCourseSection(
  input: DeleteCourseSectionInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );

  try {
    await fs.access(path.join(sectionDirectoryPath, "section.json"));
  } catch {
    throw new Error(`Section "${input.sectionId}" does not exist`);
  }

  // Removes every lesson and test the section contains along with it — the
  // explorer's confirmation dialog is what makes this an informed choice,
  // not this function.
  await fs.rm(sectionDirectoryPath, { force: true, recursive: true });

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteLocalCourseLesson(
  input: DeleteCourseLessonInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );
  const lessonDefinitionPath = path.join(sectionDirectoryPath, `${input.lessonId}.json`);

  try {
    await fs.access(lessonDefinitionPath);
  } catch {
    throw new Error(`Lesson "${input.lessonId}" does not exist`);
  }

  await fs.rm(lessonDefinitionPath, { force: true });

  await Promise.all(
    manifest.supportedLocales.map((locale) =>
      fs.rm(path.join(sectionDirectoryPath, "locales", locale, `${input.lessonId}.md`), {
        force: true,
      }),
    ),
  );

  // A lesson-attached test (if this lesson ever had one) lives right next to
  // it under the resolved test id — best-effort, most lessons don't have one.
  const lessonTestId = resolveTestIdForLesson(input.lessonId);

  await fs.rm(path.join(sectionDirectoryPath, `${lessonTestId}.json`), { force: true });

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteLocalCourseSectionTest(
  input: DeleteCourseSectionTestInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(
    courseDirectoryPath,
    input.sectionId,
  );
  const testDefinitionPath = path.join(sectionDirectoryPath, `${input.testId}.json`);

  try {
    await fs.access(testDefinitionPath);
  } catch {
    throw new Error(`Test "${input.testId}" does not exist`);
  }

  await fs.rm(testDefinitionPath, { force: true });

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateLocalCourseDraftMetadata(
  input: UpdateCourseDraftMetadataInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const supportedLocales = normalizeSupportedLocales(
    input.defaultLocale,
    input.supportedLocales,
  );
  const fallbackDefaultLocaleMetadata = manifest.locales[input.defaultLocale] ?? {
    description: "",
    title: "",
  };
  const nextLocales = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      {
        description:
          input.locales[locale]?.description.trim() ??
          manifest.locales[locale]?.description ??
          "",
        title:
          input.locales[locale]?.title.trim() ??
          manifest.locales[locale]?.title ??
          (locale === input.defaultLocale ? fallbackDefaultLocaleMetadata.title : ""),
      },
    ]),
  ) as CourseManifest["locales"];

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    contentRating: normalizeContentRating(input.contentRating),
    defaultLocale: input.defaultLocale,
    descriptiveTags: input.descriptiveTags,
    locales: nextLocales,
    supportedLocales,
    updatedAt: new Date().toISOString(),
  });
}

export async function uploadLocalCourseAsset(
  input: UploadCourseAssetInput,
): Promise<UploadCourseAssetResult> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const allowedExtensions = assetExtensionsByKind[input.kind];
  const dialogResult = await dialog.showOpenDialog({
    filters: [
      {
        extensions: [...allowedExtensions].map((extension) =>
          extension.replace(/^\./, ""),
        ),
        name: input.kind,
      },
    ],
    properties: ["openFile"],
  });

  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return null;
  }

  const sourcePath = dialogResult.filePaths[0];
  const extension = path.extname(sourcePath).toLowerCase();
  const mimeType = allowedExtensions.has(extension)
    ? assetMimeTypesByExtension[extension]
    : undefined;

  if (!mimeType) {
    throw new Error(`Unsupported file type "${extension}"`);
  }

  const assetsDirectoryPath = path.join(courseDirectoryPath, "assets");

  await fs.mkdir(assetsDirectoryPath, { recursive: true });

  const filename = createAssetFilename(path.basename(sourcePath));

  await copyFileAtomic(sourcePath, path.join(assetsDirectoryPath, filename));

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });

  return { mimeType, path: filename };
}

// Same shape as `uploadLocalCourseAsset` above, minus the native file dialog:
// the source is one of the app's own bundled maps (`regionPickerSvgPresets`)
// rather than a file the teacher picks, but the result — a copy landing in
// the course's own `assets/` directory — is identical, so the exercise ends
// up referencing a real course asset like any upload and the course stays
// portable.
export async function applyCourseSvgPreset(
  input: ApplyCourseSvgPresetInput,
): Promise<ApplyCourseSvgPresetResult> {
  const sourcePath = getBundledSvgPresetPath(input.presetId);

  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(
    localCoursesRoot,
    input.courseId,
  );
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const assetsDirectoryPath = path.join(courseDirectoryPath, "assets");

  await fs.mkdir(assetsDirectoryPath, { recursive: true });

  const filename = createAssetFilename(path.basename(sourcePath));

  await copyFileAtomic(sourcePath, path.join(assetsDirectoryPath, filename));

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });

  return { mimeType: assetMimeTypesByExtension[".svg"], path: filename };
}

export async function cutLocalCourseVersion(
  input: CutCourseVersionInput,
): Promise<CutCourseVersionResult> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = resolveCourseRootPath(localCoursesRoot, input.courseId);
  const draftDirectoryPath = getDraftDirectoryPath(courseRootPath);
  const manifest = await readCourseManifest(draftDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${input.courseId}" is not a draft`);
  }

  const currentVersionInfo = manifest.versionInfo ?? parseCourseVersion(manifest.version);
  const nextVersionInfo = bumpCourseVersion(currentVersionInfo, input.releaseType);
  const nextVersion = formatCourseVersion(nextVersionInfo);
  const versionsDirectoryPath = path.join(courseRootPath, "versions");
  const targetSnapshotPath = path.join(versionsDirectoryPath, nextVersion);

  if (await pathExists(targetSnapshotPath)) {
    throw new Error(`Version "${nextVersion}" has already been cut`);
  }

  const previousSnapshot = await findMostRecentSnapshot(versionsDirectoryPath);
  const tempSnapshotPath = `${targetSnapshotPath}.tmp-${process.pid}-${Date.now()}`;

  const fileHashes = await copyDirectoryWithDedup(
    draftDirectoryPath,
    tempSnapshotPath,
    previousSnapshot,
  );

  const nowIso = new Date().toISOString();

  await writeCourseManifest(tempSnapshotPath, {
    ...manifest,
    updatedAt: nowIso,
    version: nextVersion,
    versionInfo: nextVersionInfo,
  });
  await fs.writeFile(
    getVersionMetaPath(tempSnapshotPath),
    JSON.stringify(
      { cutAt: nowIso, fileHashes, releaseType: input.releaseType } satisfies CourseVersionMeta,
      null,
      2,
    ),
  );

  try {
    await assertCoursePackageIsPublishable(tempSnapshotPath);
  } catch (error) {
    await fs.rm(tempSnapshotPath, { force: true, recursive: true });
    throw error;
  }

  await fs.rename(tempSnapshotPath, targetSnapshotPath);

  await writeCourseManifest(draftDirectoryPath, {
    ...manifest,
    updatedAt: nowIso,
    version: nextVersion,
    versionInfo: nextVersionInfo,
  });

  return { version: nextVersion };
}

export async function revertLocalCourseDraftToVersion(
  input: RevertCourseDraftInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = resolveCourseRootPath(localCoursesRoot, input.courseId);
  const draftDirectoryPath = getDraftDirectoryPath(courseRootPath);
  const snapshotPath = path.join(courseRootPath, "versions", input.version);

  if (!(await pathExists(snapshotPath))) {
    throw new Error(`Version "${input.version}" does not exist`);
  }

  const stagingDraftPath = path.join(
    courseRootPath,
    `.draft-staging-${process.pid}-${Date.now()}`,
  );

  await copyDirectoryWithDedup(snapshotPath, stagingDraftPath, null);

  const snapshotManifest = await readCourseManifest(stagingDraftPath);

  await writeCourseManifest(stagingDraftPath, {
    ...snapshotManifest,
    status: "draft",
    updatedAt: new Date().toISOString(),
  });

  const retiredDraftPath = path.join(
    courseRootPath,
    `.draft-retired-${process.pid}-${Date.now()}`,
  );

  await fs.rename(draftDirectoryPath, retiredDraftPath);
  await fs.rename(stagingDraftPath, draftDirectoryPath);

  await fs.rm(retiredDraftPath, { force: true, recursive: true }).catch(() => {
    // Best-effort cleanup — an orphaned retired draft is wasted disk space,
    // not a correctness problem.
  });
}

export async function publishLocalCourseVersion(
  input: PublishCourseVersionInput,
): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = resolveCourseRootPath(localCoursesRoot, input.courseId);
  const snapshotPath = path.join(courseRootPath, "versions", input.version);

  if (!(await pathExists(snapshotPath))) {
    throw new Error(`Version "${input.version}" does not exist`);
  }

  const releaseState = await readCourseReleaseState(courseRootPath);

  if (releaseState.everPublishedVersions.includes(input.version)) {
    throw new Error(`Version "${input.version}" has already been published`);
  }

  await writeCourseReleaseState(courseRootPath, {
    everPublishedVersions: [...releaseState.everPublishedVersions, input.version],
    publishedAt: new Date().toISOString(),
    publishedVersion: input.version,
  });
}

export async function getPublishedCoursePackagePath(courseId: string): Promise<string | null> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = resolveCourseRootPath(localCoursesRoot, courseId);
  const releaseState = await readCourseReleaseState(courseRootPath);

  if (!releaseState.publishedVersion) {
    return null;
  }

  return path.join(courseRootPath, "versions", releaseState.publishedVersion);
}
