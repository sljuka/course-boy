type CourseAssetKind = "audio" | "image" | "svg" | "video";

const assetExtensionsByKind: Record<CourseAssetKind, Set<string>> = {
  audio: new Set([".mp3", ".wav", ".m4a", ".ogg"]),
  image: new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]),
  // A dedicated kind (rather than reusing "image") so the upload dialog only
  // offers files this exercise kind can actually render as clickable
  // regions — a raster image picked from "image" would fail to parse.
  svg: new Set([".svg"]),
  video: new Set([".mp4", ".webm", ".mov"]),
};

const assetMimeTypesByExtension: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function extractAssetExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return "";
  }

  return filename.slice(lastDotIndex).toLowerCase();
}

function slugifyAssetBaseName(baseName: string): string {
  return baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Asset filenames are content-addressed: the suffix is the first
// ASSET_HASH_LENGTH hex characters of the file's sha256. Assets are never
// edited after upload, so re-uploading the same bytes resolves to the same
// name — one file on disk, hardlinked (not copied) into the next cut version,
// and nothing new for a peer to download when the course is shared again.
// 16 hex characters (64 bits) keeps collisions out of reach for any one course.
const ASSET_HASH_LENGTH = 16;

function createAssetFilename(originalFilename: string, contentHash: string): string {
  const extension = extractAssetExtension(originalFilename);
  const baseName = extension
    ? originalFilename.slice(0, -extension.length)
    : originalFilename;
  const slug = slugifyAssetBaseName(baseName) || "asset";

  return `${slug}-${contentHash.slice(0, ASSET_HASH_LENGTH)}${extension}`;
}

// The same bytes uploaded under a different original name ("photo.png" vs
// "IMG_001.png") produce a different slug prefix but the same hash suffix —
// reuse whichever file already carries that hash rather than storing a second
// copy under a new name.
function findAssetFilenameByContentHash(
  existingFilenames: readonly string[],
  contentHash: string,
  extension: string,
): string | null {
  const suffix = `-${contentHash.slice(0, ASSET_HASH_LENGTH)}${extension.toLowerCase()}`;

  return existingFilenames.find((filename) => filename.endsWith(suffix)) ?? null;
}

function resolveAssetFilename(requestedFilename: string): string | null {
  if (
    !requestedFilename ||
    requestedFilename.includes("/") ||
    requestedFilename.includes("\\") ||
    requestedFilename.includes("..")
  ) {
    return null;
  }

  return requestedFilename;
}

export type { CourseAssetKind };
export {
  ASSET_HASH_LENGTH,
  assetExtensionsByKind,
  assetMimeTypesByExtension,
  createAssetFilename,
  extractAssetExtension,
  findAssetFilenameByContentHash,
  resolveAssetFilename,
};
