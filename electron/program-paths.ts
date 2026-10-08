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

// Every readable program, in the reader's language, newest change first. A
// damaged folder (or one from a newer Matko) is left out rather than failing
// the whole list.
export async function listPrograms(locale: Locale): Promise<ProgramSummary[]> {
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
            description,
            distribution: (await isImported(entry.name)) ? "imported" : "local",
            id: manifest.id,
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

export async function createProgram(input: { locale: Locale; title: string }): Promise<{ programId: string }> {
  const programId = createCourseId();
  await writeProgram({
    banner: null,
    courses: [],
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
export async function updateProgram(manifest: ProgramManifest): Promise<void> {
  if (await isImported(manifest.id)) {
    throw new Error("An imported program can't be edited");
  }
  await readProgram(manifest.id);
  await writeProgram({ ...manifest, formatVersion: PROGRAM_FORMAT_VERSION, updatedAt: new Date().toISOString() });
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
