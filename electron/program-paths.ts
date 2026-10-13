import fs from "node:fs/promises";
import path from "node:path";
import { dialog } from "electron";

import { assetExtensionsByKind, assetMimeTypesByExtension, resolveAssetFilename } from "../src/lib/course-asset-id";
import { createCourseId } from "../src/lib/course-id";
import type { Locale } from "../src/lib/i18n";
import {
  isNewerProgramFormat,
  isProgramManifest,
  isValidProgramId,
  localizeProgram,
  PROGRAM_FORMAT_VERSION,
  type ProgramManifest,
  type ProgramSummary,
} from "../src/lib/program-package";
import { storeCourseAsset, writeFileAtomic } from "./course-paths";
import { getProfileDataDir } from "./profile-context";
import { normalizePublisherName } from "../src/lib/publishers";

// Programs on disk (SLJ-32), per profile: `programs/<program-id>/` holds
// `program.json` and `assets/` (the logo and banner, content-addressed like
// course assets). Phase 1: your own programs, made and edited here. See
// src/lib/program-package.ts for the format and docs/contracts.md §5.

const PROGRAM_FILENAME = "program.json";
const ASSETS_DIRECTORY = "assets";

export function getProgramsRoot(): string {
  return path.join(getProfileDataDir(), "programs");
}

// The program's folder, for an id that came from the renderer or a file:
// checked before it becomes a path.
function programDirectory(programId: string): string {
  if (!isValidProgramId(programId)) {
    throw new Error(`Invalid program id "${programId}"`);
  }
  return path.join(getProgramsRoot(), programId);
}

export class NewerProgramFormatError extends Error {
  constructor() {
    super("This program was made with a newer version of Matko");
  }
}

export async function readProgram(programId: string): Promise<ProgramManifest> {
  const text = await fs.readFile(path.join(programDirectory(programId), PROGRAM_FILENAME), "utf8");
  const manifest: unknown = JSON.parse(text);

  if (isNewerProgramFormat(manifest)) throw new NewerProgramFormatError();
  if (!isProgramManifest(manifest) || manifest.id !== programId) {
    throw new Error(`Program "${programId}" is damaged`);
  }
  return manifest;
}

async function isImported(programId: string): Promise<boolean> {
  return fs
    .access(path.join(programDirectory(programId), "source.json"))
    .then(() => true)
    .catch(() => false);
}

// The Publisher name an imported program carries (its source.json's
// `publisher.name`), or null. A claim, like the Publisher ID.
export async function readImportedProgramPublisherName(programId: string): Promise<string | null> {
  try {
    const source = JSON.parse(await fs.readFile(path.join(programDirectory(programId), "source.json"), "utf8"));
    return normalizePublisherName(source?.publisher?.name) || null;
  } catch {
    return null;
  }
}

// Every readable program, in the reader's language, newest change first. A
// damaged folder (or one from a newer Matko) is left out rather than failing
// the whole list.
// `newCourseIds`: an imported program's courses the student hasn't seen yet
// (program-sharing.ts).
export async function listPrograms(
  locale: Locale,
  newCourseIds: (programId: string, courseIds: string[]) => string[] = () => [],
): Promise<ProgramSummary[]> {
  let entries;
  try {
    entries = await fs.readdir(getProgramsRoot(), { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const summaries = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && isValidProgramId(entry.name))
      .map(async (entry): Promise<ProgramSummary | null> => {
        try {
          const manifest = await readProgram(entry.name);
          const { description, title } = localizeProgram(manifest, locale);
          return {
            courseCount: manifest.courses.length,
            courseIds: manifest.courses.map((course) => course.courseId),
            description,
            distribution: (await isImported(entry.name)) ? "imported" : "local",
            id: manifest.id,
            kind: manifest.kind ?? "program",
            logo: manifest.logo,
            newCourseCount: newCourseIds(
              manifest.id,
              manifest.courses.map((course) => course.courseId),
            ).length,
            title,
            updatedAt: manifest.updatedAt,
          };
        } catch {
          return null;
        }
      }),
  );

  return summaries
    .filter((summary): summary is ProgramSummary => summary !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function writeProgram(manifest: ProgramManifest): Promise<void> {
  if (!isProgramManifest(manifest)) {
    throw new Error("Program data is invalid");
  }
  const directory = programDirectory(manifest.id);
  await fs.mkdir(directory, { recursive: true });
  await writeFileAtomic(path.join(directory, PROGRAM_FILENAME), `${JSON.stringify(manifest, null, 2)}\n`);
}

// `kind: "channel"`: a channel (SLJ-31), stored the same way.
export async function createProgram(input: {
  kind?: "channel";
  locale: Locale;
  title: string;
}): Promise<{ programId: string }> {
  const programId = createCourseId();
  await writeProgram({
    banner: null,
    courses: [],
    ...(input.kind === "channel" ? { kind: "channel" as const, programs: [] } : {}),
    defaultLocale: input.locale,
    formatVersion: PROGRAM_FORMAT_VERSION,
    id: programId,
    locales: { [input.locale]: { description: "", title: input.title } },
    logo: null,
    supportedLocales: [input.locale],
    theme: null,
    updatedAt: new Date().toISOString(),
  });
  return { programId };
}

// Saves the curator's edit of their own program. Imported programs are
// read-only (they follow their publisher). Images the program no longer uses
// (a replaced logo) stay until it's published (phase 2), like a course's
// unused assets until a version is cut: removing them on every save could
// delete a just-picked image before the program points at it.
//
// A channel (SLJ-31) stays a channel, and its courses are main's to keep
// (electron/channels.ts, from "Show on my channel"): the editor's copy of
// them is ignored, so a save never undoes a listing made meanwhile.
// `fromChannels`: that update, from main.
export async function updateProgram(manifest: ProgramManifest, { fromChannels = false } = {}): Promise<void> {
  if (await isImported(manifest.id)) {
    throw new Error("An imported program can't be edited");
  }
  const current = await readProgram(manifest.id);
  const channel =
    current.kind === "channel"
      ? { courses: fromChannels ? manifest.courses : current.courses, kind: "channel" as const, programs: manifest.programs ?? [] }
      : { kind: undefined, programs: undefined };
  await writeProgram({ ...manifest, ...channel, formatVersion: PROGRAM_FORMAT_VERSION, updatedAt: new Date().toISOString() });
}

// Picks an image (the OS dialog) and stores it in the program's assets/;
// the curator's edit then points `logo` or `banner` at the returned name.
export async function uploadProgramImage(programId: string): Promise<{ filename: string } | null> {
  await readProgram(programId);
  const extensions = assetExtensionsByKind.image;
  const result = await dialog.showOpenDialog({
    filters: [{ extensions: [...extensions].map((extension) => extension.replace(/^\./, "")), name: "image" }],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  if (!extensions.has(path.extname(sourcePath).toLowerCase())) {
    throw new Error(`Unsupported file type "${path.extname(sourcePath)}"`);
  }
  const filename = await storeCourseAsset(
    path.join(programDirectory(programId), ASSETS_DIRECTORY),
    path.basename(sourcePath),
    (tmpPath) => fs.copyFile(sourcePath, tmpPath),
  );
  return { filename };
}

export async function removeProgram(programId: string): Promise<void> {
  await fs.rm(programDirectory(programId), { force: true, recursive: true });
}

// A program asset for the `matko-asset://program-<id>/<filename>` protocol:
// its path and type, or null when there's no such file.
export async function resolveProgramAsset(
  programId: string,
  requestedFilename: string,
): Promise<{ filePath: string; mimeType: string } | null> {
  const filename = resolveAssetFilename(requestedFilename);
  if (!isValidProgramId(programId) || !filename) return null;

  const mimeType = assetMimeTypesByExtension[path.extname(filename).toLowerCase()];
  const filePath = path.join(programDirectory(programId), ASSETS_DIRECTORY, filename);
  if (!mimeType) return null;

  return fs
    .access(filePath)
    .then(() => ({ filePath, mimeType }))
    .catch(() => null);
}

// ─── Sharing (SLJ-32 phase 2) ───────────────────────────────────────────────

// Before a Publish: images the program no longer uses are removed (a replaced
// logo), so they don't go online. Safe here, unlike on every save: the
// program has just been saved, and nothing is being picked.
//
// Your own courses added before you published them get their code now (one
// added unpublished has none, and students couldn't get it), from `codeFor`.
//
// `own`: the curator's Publisher ID and name, for the courses of theirs in it
// (`isOwn`), so each course says who published it (SLJ-126).
export async function prepareProgramForPublish(
  programId: string,
  codeFor: (courseId: string) => string | null = () => null,
  own: { isOwn: (courseId: string) => boolean; publisherId: string | null; publisherName: string } | null = null,
): Promise<string> {
  let manifest = await readProgram(programId);
  const courses = manifest.courses.map((course) => {
    const withCode = course.code ? course : { ...course, code: codeFor(course.courseId) };
    return own?.publisherId && own.isOwn(course.courseId)
      ? {
          ...withCode,
          snapshot: { ...withCode.snapshot, publisherId: own.publisherId, publisherName: own.publisherName || null },
        }
      : withCode;
  });
  if (JSON.stringify(courses) !== JSON.stringify(manifest.courses)) {
    manifest = { ...manifest, courses, updatedAt: new Date().toISOString() };
    await writeProgram(manifest);
  }
  const directory = programDirectory(programId);
  const assetsDirectory = path.join(directory, ASSETS_DIRECTORY);
  const used = new Set([manifest.logo, manifest.banner].filter(Boolean));
  const filenames = await fs.readdir(assetsDirectory).catch(() => [] as string[]);

  await Promise.all(
    filenames
      .filter((filename) => !filename.startsWith(".") && !used.has(filename))
      .map((filename) => fs.rm(path.join(assetsDirectory, filename), { force: true })),
  );
  return directory;
}

// An imported program replaced with its publisher's latest: `download`
// mirrors the drive into a copy of the program's folder (only what changed is
// written), which must hold a valid program.json with the same id before it's
// swapped in. A failed or damaged download leaves the program as it was.
export async function applyProgramUpdate(
  programId: string,
  download: (stagingPath: string) => Promise<unknown>,
): Promise<void> {
  const directory = programDirectory(programId);
  const stagingPath = path.join(getProgramsRoot(), `.update-${programId}-${Date.now()}`);
  const retiredPath = path.join(getProgramsRoot(), `.retired-${programId}-${Date.now()}`);

  try {
    await fs.cp(directory, stagingPath, { recursive: true });
    await download(stagingPath);
    const manifest: unknown = JSON.parse(await fs.readFile(path.join(stagingPath, PROGRAM_FILENAME), "utf8"));
    if (!isProgramManifest(manifest) || manifest.id !== programId) {
      throw new Error(`The update of program "${programId}" is damaged`);
    }
    await fs.rename(directory, retiredPath);
    await fs.rename(stagingPath, directory);
  } finally {
    await fs.rm(stagingPath, { force: true, recursive: true }).catch(() => {});
    await fs.rm(retiredPath, { force: true, recursive: true }).catch(() => {});
  }
}

// Restoring (SLJ-32): a program of yours found again among students with the
// restored identity, downloaded into `stagingPath` by the worker. It lands as
// your own again: without the drive's `source.json` (which would make it an
// imported, read-only program). Refused if it's damaged or already here.
export async function landRestoredProgram(input: { programId: string; stagingPath: string }): Promise<{ title: string }> {
  const directory = programDirectory(input.programId);
  const manifest: unknown = JSON.parse(await fs.readFile(path.join(input.stagingPath, PROGRAM_FILENAME), "utf8"));
  if (!isProgramManifest(manifest) || manifest.id !== input.programId) {
    throw new Error(`The program "${input.programId}" found is damaged`);
  }
  await fs.rm(path.join(input.stagingPath, "source.json"), { force: true });
  await fs.mkdir(getProgramsRoot(), { recursive: true });
  await fs.rename(input.stagingPath, directory);
  return { title: localizeProgram(manifest, manifest.defaultLocale).title };
}

// The program's title, if it's on this device (restoring the same identity
// again: it never left).
export async function programOnDevice(programId: string): Promise<{ title: string } | null> {
  try {
    const manifest = await readProgram(programId);
    return { title: localizeProgram(manifest, manifest.defaultLocale).title };
  } catch {
    return null;
  }
}
