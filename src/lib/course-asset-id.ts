type CourseAssetKind = "audio" | "image" | "video";

const assetExtensionsByKind: Record<CourseAssetKind, Set<string>> = {
  audio: new Set([".mp3", ".wav", ".m4a", ".ogg"]),
  image: new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]),
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

function createAssetIdSuffix(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

function createAssetFilename(originalFilename: string): string {
  const extension = extractAssetExtension(originalFilename);
  const baseName = extension
    ? originalFilename.slice(0, -extension.length)
    : originalFilename;
  const slug = slugifyAssetBaseName(baseName) || "asset";

  return `${slug}-${createAssetIdSuffix()}${extension}`;
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
  assetExtensionsByKind,
  assetMimeTypesByExtension,
  createAssetFilename,
  resolveAssetFilename,
};
