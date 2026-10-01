import fs from "node:fs/promises";
import path from "node:path";

// Which of a course package's `assets/` files the package actually references.
//
// Assets are referenced by bare filename (see docs/contracts.md §5), from lesson
// markdown, lesson/test/section JSON and course.json alike. Rather than walking
// every field of every block and exercise kind that *might* hold a filename —
// which a new block type could silently slip past — this treats an asset as
// referenced when its filename appears anywhere in the package's .json/.md
// text. Asset filenames end in a content hash (see `createAssetFilename`), so an
// accidental substring match is practically impossible, and the failure mode of
// a false positive is only ever keeping a file that could have been dropped.
//
// Deliberately free of imports from course-paths.ts: that module uses this one
// when cutting a version, so importing back would create a cycle.

const ASSETS_DIRECTORY_NAME = "assets";

// `version-meta.json` lists every file of a cut version by path, `assets/…`
// included — scanning it would mark every asset as referenced.
const NON_REFERENCING_FILENAMES = new Set(["version-meta.json", "changelog.json"]);

const REFERENCING_EXTENSIONS = new Set([".json", ".md"]);

export type CourseAssetUsage = {
  referenced: Set<string>;
  unreferenced: string[];
};

export function partitionAssetsByUsage(
  assetFilenames: readonly string[],
  referencingTexts: readonly string[],
): CourseAssetUsage {
  const referenced = new Set<string>();
  const unreferenced: string[] = [];

  for (const filename of assetFilenames) {
    if (referencingTexts.some((text) => text.includes(filename))) {
      referenced.add(filename);
    } else {
      unreferenced.push(filename);
    }
  }

  return { referenced, unreferenced: unreferenced.sort() };
}

// Returns the asset filename for a path relative to a package root when that
// path is a direct child of `assets/`, and null for anything else.
export function assetFilenameFromRelativePath(relativePath: string): string | null {
  const segments = relativePath.split(path.sep);

  return segments.length === 2 && segments[0] === ASSETS_DIRECTORY_NAME ? segments[1] : null;
}

async function listAssetFilenames(packageDirectoryPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(path.join(packageDirectoryPath, ASSETS_DIRECTORY_NAME), {
      withFileTypes: true,
    });

    // Dotfiles (`.DS_Store`, an in-flight `.upload.tmp-…`) are never assets.
    return entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readReferencingTexts(directoryPath: string, isPackageRoot: boolean): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (isPackageRoot && entry.name === ASSETS_DIRECTORY_NAME) {
          return [];
        }

        return readReferencingTexts(entryPath, false);
      }

      if (
        !entry.isFile() ||
        NON_REFERENCING_FILENAMES.has(entry.name) ||
        !REFERENCING_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        return [];
      }

      return [await fs.readFile(entryPath, "utf8")];
    }),
  );

  return nested.flat();
}

export async function getCourseAssetUsage(packageDirectoryPath: string): Promise<CourseAssetUsage> {
  const [assetFilenames, referencingTexts] = await Promise.all([
    listAssetFilenames(packageDirectoryPath),
    readReferencingTexts(packageDirectoryPath, true),
  ]);

  return partitionAssetsByUsage(assetFilenames, referencingTexts);
}

// True for every package file that belongs in a cut version: anything outside
// `assets/`, plus the assets the package references.
export function createReferencedFilesFilter(
  usage: CourseAssetUsage,
): (relativePath: string) => boolean {
  return (relativePath) => {
    const assetFilename = assetFilenameFromRelativePath(relativePath);

    return assetFilename === null || usage.referenced.has(assetFilename);
  };
}
