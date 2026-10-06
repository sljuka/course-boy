import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { dialog, shell } from "electron";
import type {
  ApplyCourseSvgPresetInput,
  CourseChangelogEntry,
  DraftChangesPreview,
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
  UpdateCourseSectionInput,
  UpdateCourseSectionTestMetadataInput,
  UpdateLessonContentInput,
  UpdateSectionIntroInput,
  RemoveSectionIntroInput,
  UploadCourseAssetBytesInput,
  UploadCourseAssetBytesResult,
  UploadCourseAssetInput,
  UploadCourseAssetResult,
  UnusedDraftAsset,
} from "../src/lib/course-package";
import {
  assetExtensionsByKind,
  assetMimeTypesByExtension,
  createAssetFilename,
  extractAssetExtension,
  findAssetFilenameByContentHash,
} from "../src/lib/course-asset-id";
import { regionPickerSvgPresets } from "../src/lib/region-picker-svg-presets";
import {
  assertCoursePackageIsPublishable,
  isDraftSharedTestDefinition,
  isLocalizedSectionMetadata,
  resolvePackageDirectoryCandidates,
} from "./course-registry";
import { resolveTestIdForLesson } from "../src/lib/course-test-id";
import { isLocale, locales, type Locale } from "../src/lib/i18n";
import {
  compareCourseVersions,
  createInitialCourseVersion,
  formatCourseVersion,
  nextCourseVersion,
  parseCourseVersion,
  type CourseVersionReleaseType,
} from "../src/lib/course-versioning";
import { createCourseId, isValidCourseId } from "../src/lib/course-id";
import { slugifyCourseName } from "../src/lib/course-slug";
import { computeCourseChanges, findMissingAssets, readChangelog } from "./course-changes";
import { createReferencedFilesFilter, getCourseAssetUsage } from "./course-asset-usage";
import { transliterateSerbianLatinToCyrillic } from "../src/lib/serbian-transliteration";
import {
  isSerbianScriptSetting,
  otherSerbianLocale,
  syncSerbianLocales,
  transliterateSerbianMarkdown,
  type SerbianScriptSetting,
} from "../src/lib/serbian-script";
import { getProfileDataDir } from "./profile-context";
import { parseMnemonics } from "../src/lib/mnemonics";

// The bundled "Getting Started with Matko" course. Its id follows the same
// random format as every other course (see src/lib/course-id.ts); it was
// "matko-getting-started" before ids became opaque.
const bundledSeedCourseIds = ["thys2vej6my5mpxt"] as const;
const bundledSeedCourseIdSet = new Set<string>(bundledSeedCourseIds);

export function isBundledSeedCourseId(courseId: string): boolean {
  return bundledSeedCourseIdSet.has(courseId);
}

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
  return path.join(getProfileDataDir(), "courses");
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

// One setup run per courses root, shared by every caller: concurrent callers
// await the same run, later callers get it already done. The setup copies the
// bundled seed and repairs what an earlier session left behind, so it must not
// run again while this session is writing: overlapping seed copies raced
// (EEXIST), and a repeated crash-recovery pass deleted the temp folders an
// in-flight cut or revert was building. Keyed by path so tests, which point
// userData somewhere new each time, get a fresh setup. A failed run is
// forgotten so the next call retries.
const localCoursesRootSetups = new Map<string, Promise<string>>();

export function ensureLocalCoursesRoot(): Promise<string> {
  const localCoursesRoot = getLocalCoursesRoot();
  let setup = localCoursesRootSetups.get(localCoursesRoot);

  if (!setup) {
    setup = setUpLocalCoursesRoot(localCoursesRoot);
    localCoursesRootSetups.set(localCoursesRoot, setup);
    setup.catch(() => localCoursesRootSetups.delete(localCoursesRoot));
  }

  return setup;
}

// Tests only: forget the setup, as an app restart would, so the next call runs
// it again (e.g. to check that crash recovery repairs a simulated crash).
export function forgetLocalCoursesRootSetupForTests(): void {
  localCoursesRootSetups.clear();
}

async function setUpLocalCoursesRoot(localCoursesRoot: string): Promise<string> {
  await fs.mkdir(localCoursesRoot, { recursive: true });
  await removeLegacyIdCourses(localCoursesRoot);

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
  await migrateImportedCoursesToVersionedLayout(localCoursesRoot);
  await recoverInterruptedDraftReplacements(localCoursesRoot);

  return localCoursesRoot;
}

export async function removeLocalCourse(courseId: string): Promise<void> {
  assertValidCourseId(courseId);

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

// Every course id entering the main process (from the renderer over IPC, or
// read back from disk) is checked before it becomes part of a path.
export function assertValidCourseId(courseId: string): void {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`);
  }
}

async function createUniqueCourseId(localCoursesRoot: string): Promise<string> {
  // 80 random bits make a collision practically impossible; the check only
  // guards against the unthinkable rather than resolving a likely clash.
  for (;;) {
    const courseId = createCourseId();

    if (!(await pathExists(path.join(localCoursesRoot, courseId)))) {
      return courseId;
    }
  }
}

// Course ids changed from title slugs ("polinomi") to opaque random ids
// (src/lib/course-id.ts). Old user courses are deliberately not migrated —
// the maintainer chose to drop them — so on the first launch after the change,
// every course folder whose name isn't a valid id is removed. The bundled
// course is re-seeded under its new id right after. Runs once, recorded by a
// marker file, so a folder someone later drops into courses/ by hand is never
// deleted.
const LEGACY_COURSE_ID_CLEANUP_MARKER = ".legacy-course-ids-removed";

async function removeLegacyIdCourses(localCoursesRoot: string): Promise<void> {
  const markerPath = path.join(localCoursesRoot, LEGACY_COURSE_ID_CLEANUP_MARKER);

  if (await pathExists(markerPath)) {
    return;
  }

  const entries = await fs.readdir(localCoursesRoot, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() && !entry.name.startsWith(".") && !isValidCourseId(entry.name),
      )
      .map((entry) =>
        fs.rm(path.join(localCoursesRoot, entry.name), { force: true, recursive: true }),
      ),
  );

  await writeFileAtomic(markerPath, `${new Date().toISOString()}\n`);
}

function resolveCourseDirectoryPath(
  localCoursesRoot: string,
  courseId: string,
): string {
  assertValidCourseId(courseId);

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

// Reveals the draft's directory in the OS file manager (Finder on macOS) —
// the draft, not the published copy, since this is only ever reachable from
// the draft explorer's own context menu.
// Opens the folder the course is read from: the draft for your own course, the
// version in use for an imported one (versions/<v>/), the root for the bundled
// course (see `resolvePackageDirectoryCandidates`).
export async function openCourseDirectoryInFileSystem(courseId: string): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const draftDirectoryPath = resolveCourseDirectoryPath(localCoursesRoot, courseId);
  const candidates = await resolvePackageDirectoryCandidates(path.dirname(draftDirectoryPath));
  let courseDirectoryPath = candidates[candidates.length - 1];

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "course.json"))) {
      courseDirectoryPath = candidate;
      break;
    }
  }

  const errorMessage = await shell.openPath(courseDirectoryPath);

  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

function resolveCourseRootPath(localCoursesRoot: string, courseId: string): string {
  assertValidCourseId(courseId);

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

// Streams rather than reading the whole file into memory: course assets include
// uploaded videos, which can be hundreds of megabytes.
export async function hashFileContents(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");

  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

// `fs.link` failures that mean "this filesystem/location can't hardlink here",
// where a plain copy is the right fallback: different volumes (EXDEV), a
// filesystem without hardlinks such as FAT/exFAT (EPERM/ENOTSUP), or the
// per-inode link limit (EMLINK).
const HARDLINK_UNSUPPORTED_ERROR_CODES = new Set(["EXDEV", "EPERM", "ENOTSUP", "EMLINK"]);

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
 * Two opt-in `options`, both used by cut and revert:
 * - `includeFile` skips files (by path relative to the source) — a cut uses it
 *   to leave unreferenced assets out of the version.
 * - `hardlinkFromSource` hardlinks every remaining file from the source too,
 *   not only files unchanged since `previousSnapshot`. Only safe when nothing
 *   ever edits a source file in place — true for a course draft, whose writers
 *   all replace files (write temp, then rename), and for a cut version, which
 *   is never written after it's cut. Not the default, because a generic caller
 *   can't promise that.
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
  options: {
    hardlinkFromSource?: boolean;
    includeFile?: (relativeFilePath: string) => boolean;
  } = {},
): Promise<Record<string, string>> {
  await fs.mkdir(targetDirectoryPath, { recursive: true });

  const sourceFilePaths = await listFilesRecursively(sourceDirectoryPath);
  const nextFileHashes: Record<string, string> = {};

  await Promise.all(
    sourceFilePaths.map(async (sourceFilePath) => {
      const relativeFilePath = path.relative(sourceDirectoryPath, sourceFilePath);

      if (options.includeFile && !options.includeFile(relativeFilePath)) {
        return;
      }

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

      if (options.hardlinkFromSource) {
        try {
          await fs.link(sourceFilePath, targetFilePath);
          return;
        } catch (error) {
          if (!HARDLINK_UNSUPPORTED_ERROR_CODES.has((error as NodeJS.ErrnoException).code ?? "")) {
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

// Files only a cut version has (written by the cut itself), never part of a
// draft: a revert leaves them out, and a cut never copies them from the draft.
// Copying them across as hardlinks once let a cut rewrite an older version's
// version-meta.json in place.
const VERSION_ONLY_FILES = new Set(["version-meta.json", "changelog.json"]);

function isDraftFile(relativePath: string): boolean {
  return !VERSION_ONLY_FILES.has(relativePath);
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

// A cut version's recorded file hashes (empty if its version-meta.json is
// missing or unreadable).
export async function readVersionFileHashes(
  versionDirectoryPath: string,
): Promise<Record<string, string>> {
  return (await readCourseVersionMeta(versionDirectoryPath))?.fileHashes ?? {};
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

// A course file's JSON, with the generated Serbian locale filled in from the
// source one when the course has `serbianScript` (SLJ-17). Every write of a
// course content file goes through here, so both scripts are always on disk
// and never drift — including writes from a direct IPC call.
async function writeCourseJsonFile(
  filePath: string,
  value: unknown,
  manifest: CourseManifest,
): Promise<void> {
  await writeFileAtomic(
    filePath,
    JSON.stringify(syncSerbianLocales(value, manifest.serbianScript), null, 2),
  );
}

// Regenerates the generated Serbian script across a whole draft: every
// section/lesson/test file and every lesson body. Run when a course turns
// generation on or switches its source; each file is replaced atomically.
async function regenerateSerbianScript(
  draftDirectoryPath: string,
  setting: SerbianScriptSetting,
): Promise<void> {
  const target = otherSerbianLocale(setting.source);
  const sectionEntries = (await fs.readdir(draftDirectoryPath, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory() && /^section-\d{2}-/.test(entry.name),
  );

  for (const sectionEntry of sectionEntries) {
    const sectionDirectoryPath = path.join(draftDirectoryPath, sectionEntry.name);
    const fileEntries = await fs.readdir(sectionDirectoryPath, { withFileTypes: true });

    for (const fileEntry of fileEntries) {
      if (!fileEntry.isFile() || !fileEntry.name.endsWith(".json")) {
        continue;
      }

      const filePath = path.join(sectionDirectoryPath, fileEntry.name);
      const contents = await fs.readFile(filePath, "utf8");
      const synced = JSON.stringify(syncSerbianLocales(JSON.parse(contents), setting), null, 2);

      if (synced !== contents) {
        await writeFileAtomic(filePath, synced);
      }
    }

    const sourceBodiesPath = path.join(sectionDirectoryPath, "locales", setting.source);
    const targetBodiesPath = path.join(sectionDirectoryPath, "locales", target);
    let bodyFilenames: string[] = [];

    try {
      bodyFilenames = (await fs.readdir(sourceBodiesPath)).filter((name) => name.endsWith(".md"));
    } catch {
      continue;
    }

    await fs.mkdir(targetBodiesPath, { recursive: true });

    for (const filename of bodyFilenames) {
      const body = await fs.readFile(path.join(sourceBodiesPath, filename), "utf8");

      await writeFileAtomic(
        path.join(targetBodiesPath, filename),
        transliterateSerbianMarkdown(body, setting),
      );
    }
  }
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
  const slug = slugifyCourseName(normalizedTitle) || "untitled-course";
  const courseId = await createUniqueCourseId(localCoursesRoot);
  const courseRootPath = path.join(localCoursesRoot, courseId);
  const courseDirectoryPath = getDraftDirectoryPath(courseRootPath);
  const nowIso = new Date().toISOString();
  const versionInfo = createInitialCourseVersion();

  await fs.mkdir(courseDirectoryPath, { recursive: true });

  await writeFileAtomic(
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
        // Human-readable, informational only — never used as an identifier.
        slug,
        status: resolveCourseStatus(),
        minAppVersion: "0.1.0",
        createdAt: nowIso,
        updatedAt: nowIso,
        isSeededOnFirstRun: false,
        locales: normalizedLocales,
        // "Generate Cyrillic from Latin" at creation keeps generating it.
        ...(input.deriveSrCyrlFromSr && supportedLocales.includes("sr")
          ? { serbianScript: { source: "sr" } satisfies SerbianScriptSetting }
          : {}),
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
  await writeCourseJsonFile(
    path.join(sectionDirectoryPath, "section.json"),
    {
      id: sectionId,
      slug: sectionId.replace(/^section-\d{2}-/, ""),
      locales: localizedSectionMetadata,
    },
    manifest,
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: nowIso,
  });

  return { sectionId };
}

export async function updateLocalCourseSection(
  input: UpdateCourseSectionInput,
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
  const sectionDefinitionPath = path.join(sectionDirectoryPath, "section.json");

  let existingFileContents: string;

  try {
    existingFileContents = await fs.readFile(sectionDefinitionPath, "utf8");
  } catch {
    throw new Error(`Section "${input.sectionId}" does not exist`);
  }

  const localesAreValid = Object.entries(input.locales).every(
    ([locale, metadata]) => isLocale(locale) && isLocalizedSectionMetadata(metadata),
  );

  if (!localesAreValid) {
    throw new Error("Section data is invalid");
  }

  // Like a test file, a section's own identity (id/slug) is preserved —
  // only the locale content is ever replaced.
  const existingIdentity = JSON.parse(existingFileContents) as {
    id: string;
    slug: string;
  };

  await writeCourseJsonFile(
    sectionDefinitionPath,
    {
      id: existingIdentity.id,
      slug: existingIdentity.slug,
      locales: input.locales,
    },
    manifest,
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
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

  await writeCourseJsonFile(
    path.join(sectionDirectoryPath, `${lessonId}.json`),
    {
      id: lessonId,
      slug: lessonId.replace(/^lesson-\d{2}-/, ""),
      locales: localizedLessonMetadata,
    },
    manifest,
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

// A lesson body save with the generated Serbian body replaced by one made
// from the source body (the generated side is read-only; anything sent for it
// is ignored). Without a source body in the save, the generated one is left.
function withGeneratedLessonBody(
  entries: [Locale, { body: string } | undefined][],
  setting: SerbianScriptSetting | undefined,
): [Locale, { body: string } | undefined][] {
  if (!setting) {
    return entries;
  }

  const target = otherSerbianLocale(setting.source);
  const sourceEntry = entries.find(([locale]) => locale === setting.source)?.[1];
  const withoutTarget = entries.filter(([locale]) => locale !== target);

  return sourceEntry
    ? [...withoutTarget, [target, { body: transliterateSerbianMarkdown(sourceEntry.body, setting) }]]
    : withoutTarget;
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

  const localeEntries = withGeneratedLessonBody(
    Object.entries(input.locales) as [Locale, { body: string } | undefined][],
    manifest.serbianScript,
  );

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

// The section intro (SLJ-45): locales/<lang>/intro.md in the section folder,
// the same format as a lesson body. Optional: no file means no intro.
const SECTION_INTRO_FILENAME = "intro.md";

async function resolveDraftSectionDirectory(courseId: string, sectionId: string) {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseDirectoryPath = resolveCourseDirectoryPath(localCoursesRoot, courseId);
  const manifest = await readCourseManifest(courseDirectoryPath);

  if (manifest.status !== "draft") {
    throw new Error(`Course "${courseId}" is not a draft`);
  }

  const sectionDirectoryPath = resolveSectionDirectoryPath(courseDirectoryPath, sectionId);

  if (!(await pathExists(path.join(sectionDirectoryPath, "section.json")))) {
    throw new Error(`Section "${sectionId}" does not exist`);
  }

  return { courseDirectoryPath, manifest, sectionDirectoryPath };
}

export async function updateLocalCourseSectionIntro(input: UpdateSectionIntroInput): Promise<void> {
  const { courseDirectoryPath, manifest, sectionDirectoryPath } = await resolveDraftSectionDirectory(
    input.courseId,
    input.sectionId,
  );
  const localeEntries = withGeneratedLessonBody(
    Object.entries(input.locales) as [Locale, { body: string } | undefined][],
    manifest.serbianScript,
  );

  await Promise.all(
    localeEntries.map(async ([locale, localeContent]) => {
      if (!localeContent) {
        return;
      }

      const localeDirectoryPath = path.join(sectionDirectoryPath, "locales", locale);
      await fs.mkdir(localeDirectoryPath, { recursive: true });
      await writeFileAtomic(path.join(localeDirectoryPath, SECTION_INTRO_FILENAME), localeContent.body);
    }),
  );

  await writeCourseManifest(courseDirectoryPath, { ...manifest, updatedAt: new Date().toISOString() });
}

// Removes the intro in every language. Committed versions keep their copies.
export async function removeLocalCourseSectionIntro(input: RemoveSectionIntroInput): Promise<void> {
  const { courseDirectoryPath, manifest, sectionDirectoryPath } = await resolveDraftSectionDirectory(
    input.courseId,
    input.sectionId,
  );
  const localesPath = path.join(sectionDirectoryPath, "locales");
  const locales = await fs.readdir(localesPath).catch(() => [] as string[]);

  await Promise.all(
    locales.map((locale) => fs.rm(path.join(localesPath, locale, SECTION_INTRO_FILENAME), { force: true })),
  );

  await writeCourseManifest(courseDirectoryPath, { ...manifest, updatedAt: new Date().toISOString() });
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

  if (!isDraftSharedTestDefinition(input.test)) {
    throw new Error("Test data is invalid");
  }

  const testId = resolveTestIdForLesson(input.lessonId);

  await writeCourseJsonFile(path.join(sectionDirectoryPath, `${testId}.json`), input.test, manifest);

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

  if (!isDraftSharedTestDefinition(parsedValue)) {
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
  await writeCourseJsonFile(
    path.join(sectionDirectoryPath, `${testId}.json`),
    {
      id: testId,
      slug: testId.replace(/^section-test-\d{2}-/, ""),
      locales: localizedTestMetadata,
    },
    manifest,
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

  if (!isDraftSharedTestDefinition(input.test)) {
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

  await writeCourseJsonFile(
    testDefinitionPath,
    {
      id: existingIdentity.id,
      slug: existingIdentity.slug,
      locales: existingIdentity.locales,
      ...input.test,
    },
    manifest,
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
}

// The inverse of `updateLocalCourseSectionTest` above: that one preserves
// `locales` and replaces the content fields; this preserves the content
// fields and replaces `locales`. A standalone test's title/description were
// otherwise only ever set once, at `createLocalCourseSectionTest` time, with
// no way to change them afterward.
export async function updateLocalCourseSectionTestMetadata(
  input: UpdateCourseSectionTestMetadataInput,
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

  const localesAreValid = Object.entries(input.locales).every(
    ([locale, metadata]) => isLocale(locale) && isLocalizedSectionMetadata(metadata),
  );

  if (!localesAreValid) {
    throw new Error("Test data is invalid");
  }

  const existingDefinition = JSON.parse(existingFileContents) as Record<string, unknown>;

  await writeCourseJsonFile(
    testDefinitionPath,
    {
      ...existingDefinition,
      locales: input.locales,
    },
    manifest,
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
  if (!isDraftSharedTestDefinition(parsedValue)) {
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

  // Omitted keeps the course's setting, unless Serbian was taken off the
  // course; choosing a source puts both Serbian locales on it (SLJ-17).
  const keepsBothSerbianLocales =
    input.supportedLocales.includes("sr") && input.supportedLocales.includes("sr-Cyrl");
  const serbianScript =
    input.serbianScript === undefined
      ? keepsBothSerbianLocales
        ? (manifest.serbianScript ?? null)
        : null
      : input.serbianScript;

  if (serbianScript !== null && !isSerbianScriptSetting(serbianScript)) {
    throw new Error("Serbian script setting is invalid");
  }

  const supportedLocales = normalizeSupportedLocales(
    input.defaultLocale,
    serbianScript ? [...input.supportedLocales, "sr", "sr-Cyrl"] : input.supportedLocales,
  );
  const fallbackDefaultLocaleMetadata = manifest.locales[input.defaultLocale] ?? {
    description: "",
    title: "",
  };
  const nextLocales = Object.fromEntries(
    supportedLocales.map((locale) => {
      // Mnemonics (SLJ-37): the editor's list, validated, else the course's;
      // dropped when empty. Fields this version doesn't know are kept.
      const mnemonics = parseMnemonics(
        input.locales[locale]?.mnemonics ?? manifest.locales[locale]?.mnemonics,
      );
      const { mnemonics: _previousMnemonics, ...existing } = manifest.locales[locale] ?? {
        description: "",
        title: "",
      };

      return [
        locale,
        {
          ...existing,
          description:
            input.locales[locale]?.description.trim() ??
            manifest.locales[locale]?.description ??
            "",
          title:
            input.locales[locale]?.title.trim() ??
            manifest.locales[locale]?.title ??
            (locale === input.defaultLocale ? fallbackDefaultLocaleMetadata.title : ""),
          ...(mnemonics.length > 0 ? { mnemonics } : {}),
        },
      ];
    }),
  ) as CourseManifest["locales"];

  const { serbianScript: previousSerbianScript, ...manifestWithoutSerbianScript } = manifest;

  await writeCourseManifest(courseDirectoryPath, {
    ...manifestWithoutSerbianScript,
    contentRating: normalizeContentRating(input.contentRating),
    defaultLocale: input.defaultLocale,
    descriptiveTags: input.descriptiveTags,
    locales: syncSerbianLocales(nextLocales, serbianScript),
    ...(serbianScript ? { serbianScript } : {}),
    supportedLocales,
    updatedAt: new Date().toISOString(),
  });

  if (
    serbianScript &&
    JSON.stringify(serbianScript) !== JSON.stringify(previousSerbianScript ?? null)
  ) {
    await regenerateSerbianScript(courseDirectoryPath, serbianScript);
  }
}

// Lands a new asset under its content-addressed name (see `createAssetFilename`).
// `writeTempFile` puts the bytes at a temp path inside `assetsDirectoryPath`;
// the file is hashed there, then either renamed into place or — when the course
// already holds the same bytes, possibly under another original name —
// discarded in favour of the existing file. Either way the returned name is
// complete on disk: the rename is atomic, and a same-hash overwrite from a
// concurrent upload replaces identical bytes.
async function storeCourseAsset(
  assetsDirectoryPath: string,
  originalFilename: string,
  writeTempFile: (tmpPath: string) => Promise<void>,
): Promise<string> {
  await fs.mkdir(assetsDirectoryPath, { recursive: true });

  const tmpPath = path.join(
    assetsDirectoryPath,
    `.upload.tmp-${process.pid}-${Date.now()}-${crypto.randomUUID()}`,
  );

  try {
    await writeTempFile(tmpPath);

    const contentHash = await hashFileContents(tmpPath);
    const existingFilename = findAssetFilenameByContentHash(
      await fs.readdir(assetsDirectoryPath),
      contentHash,
      extractAssetExtension(originalFilename),
    );

    if (existingFilename) {
      await fs.rm(tmpPath, { force: true });
      return existingFilename;
    }

    const filename = createAssetFilename(originalFilename, contentHash);

    await fs.rename(tmpPath, path.join(assetsDirectoryPath, filename));

    return filename;
  } catch (error) {
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
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

  const filename = await storeCourseAsset(
    path.join(courseDirectoryPath, "assets"),
    path.basename(sourcePath),
    (tmpPath) => fs.copyFile(sourcePath, tmpPath),
  );

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });

  return { mimeType, path: filename };
}

// Sibling to `uploadLocalCourseAsset` above for a file the renderer already has
// bytes for (BlockNote's own "Upload from device" file input, not our own native
// dialog) — see the doc comment on `UploadCourseAssetBytesInput` for why this
// can't just reuse `uploadLocalCourseAsset`.
export async function uploadCourseAssetFromBytes(
  input: UploadCourseAssetBytesInput,
): Promise<UploadCourseAssetBytesResult> {
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
  const extension = path.extname(input.filename).toLowerCase();
  const mimeType = allowedExtensions.has(extension)
    ? assetMimeTypesByExtension[extension]
    : undefined;

  if (!mimeType) {
    throw new Error(`Unsupported file type "${extension}"`);
  }

  const filename = await storeCourseAsset(
    path.join(courseDirectoryPath, "assets"),
    path.basename(input.filename),
    (tmpPath) => fs.writeFile(tmpPath, Buffer.from(input.data)),
  );

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
//
// Like uploads (see `createAssetFilename`), the filename here is
// content-addressed — `preset-<presetId>-<contentHash>.svg` — rather than
// keyed on `presetId` alone. Two exercises applying "Europe" while the bundled file hasn't
// changed resolve to the same hash and share the one copy, same as keying
// on `presetId` alone would give. The difference shows up once a future app
// release ships an edited `europe.svg`: the hash changes, so an exercise
// that applies the preset *after* upgrading gets a new file rather than
// silently inheriting whatever stale copy an older app version left
// behind — while every exercise (in this course or any other) still
// pointing at the old hash keeps working unchanged, exactly as a course
// that isn't touched again after an app upgrade should.
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

  const contentHash = (await hashFileContents(sourcePath)).slice(0, 8);
  const filename = `preset-${input.presetId}-${contentHash}.svg`;
  const targetPath = path.join(assetsDirectoryPath, filename);

  if (!(await pathExists(targetPath))) {
    await copyFileAtomic(sourcePath, targetPath);
  }

  await writeCourseManifest(courseDirectoryPath, {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });

  return { mimeType: assetMimeTypesByExtension[".svg"], path: filename };
}

// What committing the draft now would record (SLJ-27 / SLJ-29): its changes
// since the newest version, and files its content refers to that are missing.
export async function previewLocalCourseDraftChanges(courseId: string): Promise<DraftChangesPreview> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = resolveCourseRootPath(localCoursesRoot, courseId);
  const draftDirectoryPath = getDraftDirectoryPath(courseRootPath);
  const newest = await findMostRecentSnapshot(path.join(courseRootPath, "versions"));

  return {
    baseVersion: newest ? path.basename(newest.directoryPath) : null,
    changes: await computeCourseChanges(draftDirectoryPath, newest?.directoryPath ?? null),
    missingAssets: await findMissingAssets(draftDirectoryPath),
  };
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

  const versionsDirectoryPath = path.join(courseRootPath, "versions");
  const previousSnapshot = await findMostRecentSnapshot(versionsDirectoryPath);
  // Count up from the newest version already cut, not only from the draft's own
  // number (a revert copies an older version's number into the draft). The
  // Commit dialog previews the same `nextCourseVersion`.
  const draftVersion = formatCourseVersion(
    manifest.versionInfo ?? parseCourseVersion(manifest.version),
  );
  const nextVersion = nextCourseVersion(
    draftVersion,
    previousSnapshot ? path.basename(previousSnapshot.directoryPath) : null,
    input.releaseType,
  );
  const nextVersionInfo = { ...parseCourseVersion(nextVersion), releaseType: input.releaseType };
  const targetSnapshotPath = path.join(versionsDirectoryPath, nextVersion);

  if (await pathExists(targetSnapshotPath)) {
    throw new Error(`Version "${nextVersion}" has already been cut`);
  }

  const tempSnapshotPath = `${targetSnapshotPath}.tmp-${process.pid}-${Date.now()}`;

  // A version holds only the assets its content references (unused uploads stay
  // behind in the draft), and every file is hardlinked rather than copied —
  // from the previous version when unchanged since then, else from the draft.
  // Release notes (SLJ-27): what changed since the newest version, measured
  // before the copy, plus that version's changelog to extend.
  const changes = await computeCourseChanges(
    draftDirectoryPath,
    previousSnapshot?.directoryPath ?? null,
  );
  const previousChangelog = previousSnapshot
    ? await readChangelog(previousSnapshot.directoryPath)
    : [];

  const assetUsage = await getCourseAssetUsage(draftDirectoryPath);
  const isReferencedFile = createReferencedFilesFilter(assetUsage);
  const fileHashes = await copyDirectoryWithDedup(
    draftDirectoryPath,
    tempSnapshotPath,
    previousSnapshot,
    {
      hardlinkFromSource: true,
      includeFile: (relativePath) =>
        isDraftFile(relativePath) && isReferencedFile(relativePath),
    },
  );

  const nowIso = new Date().toISOString();

  await writeCourseManifest(tempSnapshotPath, {
    ...manifest,
    updatedAt: nowIso,
    version: nextVersion,
    versionInfo: nextVersionInfo,
  });
  // The copy above hashed the draft's course.json; the version's own was just
  // rewritten with the new version number, so hash that one instead. Every
  // hash in version-meta.json must match the file in the version.
  fileHashes["course.json"] = await hashFileContents(
    path.join(tempSnapshotPath, "course.json"),
  );

  // The cumulative changelog, newest first: a student who keeps only the
  // latest few versions still has the whole history. Hashed like every file.
  const notes = input.notes?.trim();
  const changelog: CourseChangelogEntry[] = [
    {
      changes,
      cutAt: nowIso,
      ...(notes ? { notes } : {}),
      ...(input.recommended ? { recommended: true } : {}),
      version: nextVersion,
    },
    ...previousChangelog,
  ];
  await writeFileAtomic(
    path.join(tempSnapshotPath, "changelog.json"),
    JSON.stringify(changelog, null, 2),
  );
  fileHashes["changelog.json"] = await hashFileContents(
    path.join(tempSnapshotPath, "changelog.json"),
  );
  // Atomic (temp file + rename), never an in-place write: a file in a new
  // version may be a hardlink shared with an older one.
  await writeFileAtomic(
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

  const removedAssets = await removeUnusedDraftAssets(draftDirectoryPath);

  // Drafts reverted before VERSION_ONLY_FILES existed can still hold a
  // version's own files (as hardlinks into that version); drop them.
  await Promise.all(
    [...VERSION_ONLY_FILES].map((filename) =>
      fs.rm(path.join(draftDirectoryPath, filename), { force: true }),
    ),
  );

  return { removedAssets, version: nextVersion };
}

// Deletes the draft's unused assets, after a cut has safely written its
// version (which already left them out). Only ever touches `draft/assets/`:
// a version that still uses one of these files keeps its own hardlinked copy,
// and reverting to it brings the file back. Usage is recomputed here rather
// than reusing the cut's own snapshot of it, so an edit saved while the cut
// ran can't lose a file it just started referencing.
async function removeUnusedDraftAssets(draftDirectoryPath: string): Promise<string[]> {
  const { unreferenced } = await getCourseAssetUsage(draftDirectoryPath);

  await Promise.all(
    unreferenced.map((filename) =>
      fs.rm(path.join(draftDirectoryPath, "assets", filename), { force: true }),
    ),
  );

  return unreferenced;
}

export async function getUnusedDraftAssets(courseId: string): Promise<UnusedDraftAsset[]> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const draftDirectoryPath = resolveCourseDirectoryPath(localCoursesRoot, courseId);
  const { unreferenced } = await getCourseAssetUsage(draftDirectoryPath);

  return Promise.all(
    unreferenced.map(async (filename) => ({
      filename,
      sizeBytes: (await fs.stat(path.join(draftDirectoryPath, "assets", filename))).size,
    })),
  );
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

  // Hardlinked, not copied: a cut version is never written again, and the
  // draft's own writers only ever replace files, so sharing inodes is safe.
  await copyDirectoryWithDedup(snapshotPath, stagingDraftPath, null, {
    hardlinkFromSource: true,
    includeFile: isDraftFile,
  });

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

// ─── Imported courses (SLJ-40) ─────────────────────────────────────────────
//
// An imported course uses the teacher's layout minus the draft:
//   courses/<id>/release.json        { publishedVersion: <current> }
//   courses/<id>/versions/<v>/...    one folder per kept version
// The current version plus a number of previous ones (the student's
// "Previous versions to keep" setting) are kept; going back to one only
// repoints release.json. Versions share unchanged files through hardlinks, so a
// kept version costs only the files that changed in it. See docs/contracts.md §5.

export const DEFAULT_PREVIOUS_VERSIONS_TO_KEEP = 2;
export const MAX_PREVIOUS_VERSIONS_TO_KEEP = 10;

const VERSION_STAGING_PREFIX = ".staging-";

export type ImportedCourseUpdateExpectation = {
  courseId: string;
  // Where the course was recorded as coming from at import (course-sharing.json).
  driveKey: string;
  publisherId: string;
  version: string;
};

async function resolveImportedCourseRoot(courseId: string): Promise<string | null> {
  assertValidCourseId(courseId);
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const courseRootPath = resolveCourseRootPath(localCoursesRoot, courseId);

  if (bundledSeedCourseIdSet.has(courseId) || (await pathExists(path.join(courseRootPath, "draft")))) {
    return null;
  }

  return (await pathExists(courseRootPath)) ? courseRootPath : null;
}

function compareVersionStrings(left: string, right: string): number {
  return compareCourseVersions(parseCourseVersion(left), parseCourseVersion(right));
}

async function listKeptVersions(courseRootPath: string): Promise<string[]> {
  const entries = await fs.readdir(path.join(courseRootPath, "versions"), { withFileTypes: true }).catch(() => []);
  const versions: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    try {
      parseCourseVersion(entry.name);
    } catch {
      continue;
    }
    if (await pathExists(path.join(courseRootPath, "versions", entry.name, "course.json"))) {
      versions.push(entry.name);
    }
  }

  return versions.sort((left, right) => compareVersionStrings(right, left));
}

async function setCurrentImportedVersion(courseRootPath: string, version: string): Promise<void> {
  const state = await readCourseReleaseState(courseRootPath);
  await writeCourseReleaseState(courseRootPath, {
    everPublishedVersions: [...new Set([...state.everPublishedVersions, version])],
    publishedAt: new Date().toISOString(),
    publishedVersion: version,
  });
}

// Moves a root-only imported course (how imports landed before SLJ-40, and how
// the worker still lands a fresh import) into versions/<v>/ + release.json.
// Crash-safe and re-runnable: release.json is written first, and course.json is
// moved last, so an interrupted run still has a root course.json and finishes
// on the next one. Readers fall back to the root until then.
async function migrateRootOnlyImportedCourse(courseRootPath: string): Promise<void> {
  const rootManifestPath = path.join(courseRootPath, "course.json");
  let manifest: { status?: unknown; version?: unknown };

  try {
    manifest = JSON.parse(await fs.readFile(rootManifestPath, "utf8"));
  } catch {
    return;
  }

  // Only published (imported) content; unmigrated legacy drafts are
  // `migrateNonBundledCoursesToDrafts`'s job.
  if (manifest.status !== "published" || typeof manifest.version !== "string") {
    return;
  }

  const version = manifest.version;
  const versionPath = path.join(courseRootPath, "versions", version);
  await fs.mkdir(versionPath, { recursive: true });
  await setCurrentImportedVersion(courseRootPath, version);

  const entries = await fs.readdir(courseRootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (["versions", "release.json", "course.json"].includes(entry.name) || entry.name.startsWith(".")) {
      continue;
    }
    await fs.rename(path.join(courseRootPath, entry.name), path.join(versionPath, entry.name));
  }

  await fs.rename(rootManifestPath, path.join(versionPath, "course.json"));
}

// Runs on every start (from ensureLocalCoursesRoot): moves every root-only
// imported course into the versioned layout.
async function migrateImportedCoursesToVersionedLayout(localCoursesRoot: string): Promise<void> {
  const entries = await fs.readdir(localCoursesRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !isValidCourseId(entry.name) || bundledSeedCourseIdSet.has(entry.name)) {
      continue;
    }
    const courseRootPath = path.join(localCoursesRoot, entry.name);
    if (await pathExists(path.join(courseRootPath, "draft"))) {
      continue;
    }
    await migrateRootOnlyImportedCourse(courseRootPath);
  }
}

// Right after an import lands (the worker writes it root-only).
export async function migrateImportedCourse(courseId: string): Promise<void> {
  const courseRootPath = await resolveImportedCourseRoot(courseId);
  if (courseRootPath) {
    await migrateRootOnlyImportedCourse(courseRootPath);
  }
}

// The version an imported course is at, or null if it isn't an imported
// course on this device.
export async function readImportedCourseVersion(courseId: string): Promise<string | null> {
  const courseRootPath = await resolveImportedCourseRoot(courseId);
  if (!courseRootPath) {
    return null;
  }

  const { publishedVersion } = await readCourseReleaseState(courseRootPath);
  if (publishedVersion) {
    return publishedVersion;
  }

  try {
    const manifest = JSON.parse(await fs.readFile(path.join(courseRootPath, "course.json"), "utf8"));
    return typeof manifest.version === "string" ? manifest.version : null;
  } catch {
    return null;
  }
}

// The versions of an imported course kept on this device, newest first.
export async function listImportedCourseVersions(
  courseId: string,
): Promise<{ current: string | null; versions: string[] }> {
  const courseRootPath = await resolveImportedCourseRoot(courseId);
  if (!courseRootPath) {
    return { current: null, versions: [] };
  }

  return {
    current: (await readCourseReleaseState(courseRootPath)).publishedVersion,
    versions: await listKeptVersions(courseRootPath),
  };
}

// "Go back to <v>" (or forward again): repoints release.json, no download.
export async function switchImportedCourseVersion(courseId: string, version: string): Promise<void> {
  const courseRootPath = await resolveImportedCourseRoot(courseId);
  if (!courseRootPath || !(await listKeptVersions(courseRootPath)).includes(version)) {
    throw new Error(`Version ${version} of this course isn't on this device`);
  }

  await setCurrentImportedVersion(courseRootPath, version);
}

// Keeps the current version and the `previousToKeep` newest other versions.
async function pruneImportedCourseVersions(courseRootPath: string, previousToKeep: number): Promise<void> {
  const { publishedVersion } = await readCourseReleaseState(courseRootPath);
  const others = (await listKeptVersions(courseRootPath)).filter((version) => version !== publishedVersion);

  for (const version of others.slice(Math.max(0, previousToKeep))) {
    await fs.rm(path.join(courseRootPath, "versions", version), { force: true, recursive: true });
  }
}

export function clampPreviousVersionsToKeep(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(MAX_PREVIOUS_VERSIONS_TO_KEEP, Math.max(0, value))
    : DEFAULT_PREVIOUS_VERSIONS_TO_KEEP;
}

// Brings an imported course to a newer version (SLJ-39, SLJ-40):
//   - already kept (the student went back and returns): just repoint;
//   - otherwise: hardlink the current version into versions/.staging-<v>-…
//     (no data copied), `download` mirrors only what changed onto it (the
//     worker writes atomically, so hardlinked originals are never written
//     through), validate (same course, expected version, recorded source,
//     publishable), rename it to versions/<v>/ and repoint release.json.
// Then old versions beyond the student's setting are removed. The current
// version is untouched until release.json switches; any failure removes the
// staging folder and leaves the course as it was. Returns `download`'s result,
// or null when nothing had to be downloaded.
export async function applyImportedCourseUpdate<T>(
  expected: ImportedCourseUpdateExpectation,
  download: (stagingPath: string) => Promise<T>,
  options: { previousToKeep?: number } = {},
): Promise<T | null> {
  await migrateImportedCourse(expected.courseId);
  const courseRootPath = await resolveImportedCourseRoot(expected.courseId);

  if (!courseRootPath) {
    throw new Error(`Course "${expected.courseId}" isn't an imported course on this device`);
  }

  const previousToKeep = clampPreviousVersionsToKeep(options.previousToKeep);
  const keptVersions = await listKeptVersions(courseRootPath);

  if (keptVersions.includes(expected.version)) {
    await setCurrentImportedVersion(courseRootPath, expected.version);
    await pruneImportedCourseVersions(courseRootPath, previousToKeep);
    return null;
  }

  const { publishedVersion: currentVersion } = await readCourseReleaseState(courseRootPath);
  if (!currentVersion) {
    throw new Error(`Course "${expected.courseId}" has no current version`);
  }

  const versionsPath = path.join(courseRootPath, "versions");
  const stagingPath = path.join(
    versionsPath,
    `${VERSION_STAGING_PREFIX}${expected.version}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
  );

  let result: T;

  try {
    await copyDirectoryWithDedup(path.join(versionsPath, currentVersion), stagingPath, null, {
      hardlinkFromSource: true,
    });
    result = await download(stagingPath);

    const manifestPath = path.join(stagingPath, "course.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

    if (manifest.id !== expected.courseId) {
      throw new Error("The update is for a different course");
    }

    if (manifest.version !== expected.version) {
      throw new Error(`Expected version ${expected.version}, got ${String(manifest.version)}`);
    }

    const source = JSON.parse(await fs.readFile(path.join(stagingPath, "source.json"), "utf8"));

    if (source?.driveKey !== expected.driveKey || source?.publisher?.id !== expected.publisherId) {
      throw new Error("The update comes from a different source than this course");
    }

    // Same as at import: a version's own manifest still says "draft" (a cut-time
    // artifact). Atomic write: course.json may be a hardlink in staging.
    await writeFileAtomic(manifestPath, JSON.stringify({ ...manifest, status: "published" }, null, 2));
    await assertCoursePackageIsPublishable(stagingPath);

    await fs.rename(stagingPath, path.join(versionsPath, expected.version));
  } catch (error) {
    await fs.rm(stagingPath, { force: true, recursive: true }).catch(() => {});
    throw error;
  }

  await setCurrentImportedVersion(courseRootPath, expected.version);
  await pruneImportedCourseVersions(courseRootPath, previousToKeep);
  return result;
}

// At startup: removes what an update interrupted by a crash left behind:
// versions/.staging-* folders inside imported courses (SLJ-40), and the
// courses-root level .update-* folders of the pre-SLJ-40 swap, where a
// "previous" folder whose course folder is missing (a crash between that
// swap's two renames) is put back.
export async function cleanUpInterruptedCourseUpdates(): Promise<void> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const entries = await fs.readdir(localCoursesRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(localCoursesRoot, entry.name);

    if (entry.name.startsWith(".update-staging-")) {
      await fs.rm(entryPath, { force: true, recursive: true });
      continue;
    }

    const previous = entry.name.match(/^\.update-previous-([a-z2-7]{16})-/);
    if (previous) {
      const courseRootPath = path.join(localCoursesRoot, previous[1]);
      if (await pathExists(courseRootPath)) {
        await fs.rm(entryPath, { force: true, recursive: true });
      } else {
        await fs.rename(entryPath, courseRootPath);
      }
      continue;
    }

    if (isValidCourseId(entry.name)) {
      const versionsPath = path.join(entryPath, "versions");
      const versionEntries = await fs.readdir(versionsPath, { withFileTypes: true }).catch(() => []);
      for (const versionEntry of versionEntries) {
        if (versionEntry.isDirectory() && versionEntry.name.startsWith(VERSION_STAGING_PREFIX)) {
          await fs.rm(path.join(versionsPath, versionEntry.name), { force: true, recursive: true });
        }
      }
    }
  }
}

// The teacher's own courses (they have a `draft/`) that have a published version:
// the ones the app keeps shared (see electron/course-sharing.ts).
export async function listPublishedLocalCourseIds(): Promise<string[]> {
  const localCoursesRoot = await ensureLocalCoursesRoot();
  const entries = await fs.readdir(localCoursesRoot, { withFileTypes: true });
  const courseIds: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !isValidCourseId(entry.name)) {
      continue;
    }

    const courseRootPath = path.join(localCoursesRoot, entry.name);

    if (!(await pathExists(path.join(courseRootPath, "draft")))) {
      continue;
    }

    if ((await readCourseReleaseState(courseRootPath)).publishedVersion) {
      courseIds.push(entry.name);
    }
  }

  return courseIds;
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
