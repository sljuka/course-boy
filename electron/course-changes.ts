import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  CourseChange,
  CourseChangeLocation,
  CourseChangelogEntry,
} from "../src/lib/course-package";
import { resolveLessonIdForTest } from "../src/lib/course-test-id";
import { createReferencedFilesFilter, getCourseAssetUsage } from "./course-asset-usage";

// What changed between a course's draft and a cut version, for release notes
// (SLJ-27): the Commit dialog previews it, and the cut stores it in the new
// version's changelog.json. Changes are data (see `CourseChange`), named by the
// titles people know (in the course's default language), never by file paths.
//
// Kept free of course-paths.ts (which imports this for the cut), so it has its
// own small file-listing and hashing helpers.

// Written by a cut into each version; never part of a draft (see
// VERSION_ONLY_FILES in course-paths.ts).
const VERSION_ONLY_FILES = new Set(["version-meta.json", "changelog.json"]);
const ASSETS_DIRECTORY = "assets";

// An asset as content refers to it: its bare filename, e.g.
// `diagram-3fa9c2e1b07d4a55.svg` (see `createAssetFilename`).
const ASSET_REFERENCE_PATTERN =
  /[A-Za-z0-9][A-Za-z0-9_-]*-[0-9a-f]{8,}\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|mp3|wav|ogg|m4a|pdf)\b/gi;

async function listFiles(rootPath: string, relative = ""): Promise<string[]> {
  let entries;

  try {
    entries = await fs.readdir(path.join(rootPath, relative), { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = relative ? path.join(relative, entry.name) : entry.name;

      if (entry.isDirectory()) {
        return listFiles(rootPath, entryPath);
      }

      return Promise.resolve(entry.isFile() && !entry.name.startsWith(".") ? [entryPath] : []);
    }),
  );

  return nested.flat();
}

async function hashFile(filePath: string): Promise<string> {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

// The draft's files as a cut would copy them: no version-only files, and only
// assets the content references.
async function hashDraftFiles(draftDirectoryPath: string): Promise<Record<string, string>> {
  const isReferenced = createReferencedFilesFilter(await getCourseAssetUsage(draftDirectoryPath));
  const files = (await listFiles(draftDirectoryPath)).filter(
    (file) => !VERSION_ONLY_FILES.has(file) && isReferenced(file),
  );
  const hashes = await Promise.all(files.map((file) => hashFile(path.join(draftDirectoryPath, file))));

  return Object.fromEntries(files.map((file, index) => [file, hashes[index]]));
}

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function readVersionFileHashes(versionDirectoryPath: string): Promise<Record<string, string>> {
  const meta = await readJson(path.join(versionDirectoryPath, "version-meta.json"));
  const fileHashes = meta?.fileHashes;

  return fileHashes && typeof fileHashes === "object" ? (fileHashes as Record<string, string>) : {};
}

// A section's, lesson's or test's title from its JSON `locales`, preferring
// the course's default language.
function titleFrom(json: Record<string, unknown> | null, locale: string): string {
  const locales = json?.locales as Record<string, { title?: unknown }> | undefined;
  const title = locales?.[locale]?.title ?? Object.values(locales ?? {})[0]?.title;

  return typeof title === "string" && title.trim() ? title : String(json?.id ?? "");
}

type Side = { directoryPath: string; hashes: Record<string, string> };

function kindOf(existsBefore: boolean, existsAfter: boolean): "added" | "removed" | "edited" {
  return !existsBefore ? "added" : !existsAfter ? "removed" : "edited";
}

async function diffStructure(before: Side, after: Side, locale: string): Promise<CourseChange[]> {
  const paths = new Set([...Object.keys(before.hashes), ...Object.keys(after.hashes)]);
  // Only files inside folders (sections, assets/) are structure; top-level
  // files are course.json (diffed separately) and the version-only files.
  const changed = [...paths].filter(
    (file) => before.hashes[file] !== after.hashes[file] && file.includes(path.sep),
  );
  const changes: CourseChange[] = [];
  const has = (side: Side, file: string) => file in side.hashes;
  const title = async (file: string) =>
    titleFrom(
      (await readJson(path.join(after.directoryPath, file))) ??
        (await readJson(path.join(before.directoryPath, file))),
      locale,
    );

  // Sections, in folder order.
  const sections = [
    ...new Set(changed.filter((file) => !file.startsWith(`${ASSETS_DIRECTORY}${path.sep}`)).map((file) => file.split(path.sep)[0])),
  ].sort();

  for (const section of sections) {
    const sectionFile = path.join(section, "section.json");
    const sectionBefore = has(before, sectionFile);
    const sectionAfter = has(after, sectionFile);
    const sectionTitle = await title(sectionFile);

    if (!sectionBefore || !sectionAfter) {
      // A whole section added or removed: its lessons and tests go with it.
      changes.push({ kind: kindOf(sectionBefore, sectionAfter), target: "section", title: sectionTitle });
      continue;
    }

    const lessonIds = new Set<string>();
    const testIds = new Set<string>();
    let introChanged = false;
    // Changed files this function doesn't know (a future file type): still a
    // change, reported as an edit of their section, so the list never says
    // "no changes" while the draft badge (which compares every file) says there are.
    let hasOtherChange = changed.includes(sectionFile);

    for (const file of changed.filter((candidate) => candidate.split(path.sep)[0] === section)) {
      const name = path.basename(file, path.extname(file));

      if (name === "intro" && file.split(path.sep).includes("locales")) {
        // The section intro (SLJ-45), in any language.
        introChanged = true;
      } else if (name.startsWith("lesson-")) {
        lessonIds.add(name);
      } else if (name.startsWith("test-") || name.startsWith("section-test-")) {
        // `test-NN-…` is a lesson's test; `section-test-NN-…` a standalone one.
        testIds.add(name);
      } else if (file !== sectionFile) {
        hasOtherChange = true;
      }
    }

    if (hasOtherChange) {
      changes.push({ kind: "edited", target: "section", title: sectionTitle });
    }

    if (introChanged) {
      const isIntro = (file: string) =>
        file.split(path.sep)[0] === section && path.basename(file) === "intro.md";
      changes.push({
        kind: kindOf(Object.keys(before.hashes).some(isIntro), Object.keys(after.hashes).some(isIntro)),
        section: sectionTitle,
        target: "section-intro",
      });
    }

    for (const lessonId of [...lessonIds].sort()) {
      const lessonFile = path.join(section, `${lessonId}.json`);
      changes.push({
        kind: kindOf(has(before, lessonFile), has(after, lessonFile)),
        target: "lesson",
        section: sectionTitle,
        title: await title(lessonFile),
      });
    }

    for (const testId of [...testIds].sort()) {
      const testFile = path.join(section, `${testId}.json`);
      const isStandalone = testId.startsWith("section-test-");
      const lessonId = isStandalone ? "" : resolveLessonIdForTest(testId);
      const lessonFile = path.join(section, `${lessonId}.json`);
      const isLessonTest = !isStandalone && (has(before, lessonFile) || has(after, lessonFile));

      // A lesson added or removed with its test is already listed.
      if (isLessonTest && lessonIds.has(lessonId) && !(has(before, lessonFile) && has(after, lessonFile))) {
        continue;
      }

      changes.push({
        kind: kindOf(has(before, testFile), has(after, testFile)),
        target: "test",
        section: sectionTitle,
        title: await title(isLessonTest ? lessonFile : testFile),
      });
    }
  }

  // Files: names are content-addressed, so a file is only ever added or removed.
  const assetPrefix = `${ASSETS_DIRECTORY}${path.sep}`;
  const addedFiles = changed.filter((file) => file.startsWith(assetPrefix) && !has(before, file)).length;
  const removedFiles = changed.filter((file) => file.startsWith(assetPrefix) && !has(after, file)).length;

  if (addedFiles > 0) {
    changes.push({ count: addedFiles, kind: "added", target: "files" });
  }

  if (removedFiles > 0) {
    changes.push({ count: removedFiles, kind: "removed", target: "files" });
  }

  return changes;
}

function diffCourseManifest(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): CourseChange[] {
  if (!before || !after) {
    return [];
  }

  const changes: CourseChange[] = [];
  // Only languages present on both sides: a language added or removed is its
  // own change, not a title or description edit.
  const sharedLocales = Object.keys((before.locales ?? {}) as object).filter(
    (locale) => locale in ((after.locales ?? {}) as object),
  );
  const localeField = (manifest: Record<string, unknown>, field: "title" | "description" | "mnemonics") =>
    JSON.stringify(
      sharedLocales
        .sort()
        .map((locale) => [
          locale,
          ((manifest.locales as Record<string, Record<string, unknown>>)[locale]?.[field] ??
            (field === "mnemonics" ? [] : "")),
        ]),
    );

  if (localeField(before, "title") !== localeField(after, "title")) {
    changes.push({ field: "title", kind: "edited", target: "course" });
  }

  if (localeField(before, "description") !== localeField(after, "description")) {
    changes.push({ field: "description", kind: "edited", target: "course" });
  }

  if (localeField(before, "mnemonics") !== localeField(after, "mnemonics")) {
    changes.push({ field: "mnemonics", kind: "edited", target: "course" });
  }

  const languagesBefore = new Set((before.supportedLocales ?? []) as string[]);
  const languagesAfter = new Set((after.supportedLocales ?? []) as string[]);

  for (const locale of [...languagesAfter].filter((value) => !languagesBefore.has(value)).sort()) {
    changes.push({ kind: "added", locale, target: "language" });
  }

  for (const locale of [...languagesBefore].filter((value) => !languagesAfter.has(value)).sort()) {
    changes.push({ kind: "removed", locale, target: "language" });
  }

  if (before.defaultLocale !== after.defaultLocale) {
    changes.push({ field: "defaultLocale", kind: "edited", target: "course" });
  }

  if ((before.contentRating ?? "all-ages") !== (after.contentRating ?? "all-ages")) {
    changes.push({ field: "contentRating", kind: "edited", target: "course" });
  }

  if (JSON.stringify(before.descriptiveTags ?? []) !== JSON.stringify(after.descriptiveTags ?? [])) {
    changes.push({ field: "tags", kind: "edited", target: "course" });
  }

  if (JSON.stringify(before.serbianScript ?? null) !== JSON.stringify(after.serbianScript ?? null)) {
    changes.push({ field: "serbianScript", kind: "edited", target: "course" });
  }

  return changes;
}

// Everything that changed from `versionDirectoryPath` (a cut version) to the
// draft. Empty when nothing did, or when there's no version yet.
export async function computeCourseChanges(
  draftDirectoryPath: string,
  versionDirectoryPath: string | null,
): Promise<CourseChange[]> {
  if (!versionDirectoryPath) {
    return [];
  }

  const draftManifest = await readJson(path.join(draftDirectoryPath, "course.json"));
  const versionManifest = await readJson(path.join(versionDirectoryPath, "course.json"));
  const locale = String(draftManifest?.defaultLocale ?? versionManifest?.defaultLocale ?? "en");

  return [
    ...diffCourseManifest(versionManifest, draftManifest),
    ...(await diffStructure(
      { directoryPath: versionDirectoryPath, hashes: await readVersionFileHashes(versionDirectoryPath) },
      { directoryPath: draftDirectoryPath, hashes: await hashDraftFiles(draftDirectoryPath) },
      locale,
    )),
  ];
}

async function locationOf(
  draftDirectoryPath: string,
  file: string,
  locale: string,
): Promise<CourseChangeLocation> {
  const [section, ...rest] = file.split(path.sep);

  if (rest.length === 0) {
    return { target: "course" };
  }

  const sectionTitle = titleFrom(await readJson(path.join(draftDirectoryPath, section, "section.json")), locale);
  const name = path.basename(file, path.extname(file));

  if (name === "intro" && rest.includes("locales")) {
    return { section: sectionTitle, target: "section-intro" };
  }

  if (name.startsWith("section-test-")) {
    return {
      section: sectionTitle,
      target: "test",
      title: titleFrom(await readJson(path.join(draftDirectoryPath, section, `${name}.json`)), locale),
    };
  }

  if (name.startsWith("lesson-") || name.startsWith("test-")) {
    const lessonId = name.startsWith("test-") ? resolveLessonIdForTest(name) : name;
    const lesson = await readJson(path.join(draftDirectoryPath, section, `${lessonId}.json`));

    return {
      section: sectionTitle,
      target: name.startsWith("test-") ? "test" : "lesson",
      title: titleFrom(lesson ?? (await readJson(path.join(draftDirectoryPath, section, `${name}.json`))), locale),
    };
  }

  return { target: "section", title: sectionTitle };
}

// Files the draft's content refers to that aren't in its assets/ folder
// (deleted, renamed by hand, never uploaded), with where each is used.
export async function findMissingAssets(
  draftDirectoryPath: string,
): Promise<Array<{ filename: string; location: CourseChangeLocation }>> {
  const files = await listFiles(draftDirectoryPath);
  const existingAssets = new Set(
    files
      .filter((file) => file.startsWith(`${ASSETS_DIRECTORY}${path.sep}`))
      .map((file) => path.basename(file)),
  );
  const draftManifest = await readJson(path.join(draftDirectoryPath, "course.json"));
  const locale = String(draftManifest?.defaultLocale ?? "en");
  const missing: Array<{ filename: string; location: CourseChangeLocation }> = [];
  const seen = new Set<string>();

  for (const file of files.sort()) {
    if (
      file.startsWith(`${ASSETS_DIRECTORY}${path.sep}`) ||
      VERSION_ONLY_FILES.has(file) ||
      ![".json", ".md"].includes(path.extname(file).toLowerCase())
    ) {
      continue;
    }

    const text = await fs.readFile(path.join(draftDirectoryPath, file), "utf8");

    for (const [filename] of text.matchAll(ASSET_REFERENCE_PATTERN)) {
      const key = `${file}\u0000${filename}`;

      if (!existingAssets.has(filename) && !seen.has(key)) {
        seen.add(key);
        missing.push({ filename, location: await locationOf(draftDirectoryPath, file, locale) });
      }
    }
  }

  return missing;
}

// A version's changelog (newest first), or an empty list when it has none
// (cut before changelogs existed, or unreadable).
export async function readChangelog(versionDirectoryPath: string): Promise<CourseChangelogEntry[]> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(path.join(versionDirectoryPath, "changelog.json"), "utf8"),
    ) as unknown;

    return Array.isArray(parsed) ? (parsed as CourseChangelogEntry[]) : [];
  } catch {
    return [];
  }
}
