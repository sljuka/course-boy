import { describe, expect, it } from "vitest";

import {
  ASSET_HASH_LENGTH,
  assetExtensionsByKind,
  assetMimeTypesByExtension,
  createAssetFilename,
  findAssetFilenameByContentHash,
  resolveAssetFilename,
} from "./course-asset-id";

describe("assetExtensionsByKind", () => {
  it("covers a mime type for every allowed extension", () => {
    for (const extensions of Object.values(assetExtensionsByKind)) {
      for (const extension of extensions) {
        expect(assetMimeTypesByExtension[extension]).toBeDefined();
      }
    }
  });
});

const HASH_A = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const HASH_B = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

describe("createAssetFilename", () => {
  it("slugifies the base name, appends the truncated content hash, keeps the extension", () => {
    expect(createAssetFilename("My Vacation Photo.PNG", HASH_A)).toBe(
      "my-vacation-photo-0123456789abcdef.png",
    );
  });

  it("uses exactly ASSET_HASH_LENGTH hash characters", () => {
    const filename = createAssetFilename("clip.mp4", HASH_A);

    expect(filename).toMatch(new RegExp(`^clip-[0-9a-f]{${ASSET_HASH_LENGTH}}\\.mp4$`));
  });

  it("gives the same name for the same content and a different one for different content", () => {
    expect(createAssetFilename("clip.mp4", HASH_A)).toBe(createAssetFilename("clip.mp4", HASH_A));
    expect(createAssetFilename("clip.mp4", HASH_A)).not.toBe(
      createAssetFilename("clip.mp4", HASH_B),
    );
  });

  it("falls back to a generic base name when nothing slugifiable remains", () => {
    expect(createAssetFilename("???.mp3", HASH_A)).toBe("asset-0123456789abcdef.mp3");
  });

  it("handles filenames with no extension", () => {
    expect(createAssetFilename("README", HASH_A)).toBe("readme-0123456789abcdef");
  });
});

describe("findAssetFilenameByContentHash", () => {
  const existing = ["photo-0123456789abcdef.png", "clip-fedcba9876543210.mp4"];

  it("finds a file with the same content under a different original name", () => {
    expect(findAssetFilenameByContentHash(existing, HASH_A, ".png")).toBe(
      "photo-0123456789abcdef.png",
    );
  });

  it("matches the extension case-insensitively", () => {
    expect(findAssetFilenameByContentHash(existing, HASH_A, ".PNG")).toBe(
      "photo-0123456789abcdef.png",
    );
  });

  it("does not match the same hash with a different extension", () => {
    expect(findAssetFilenameByContentHash(existing, HASH_A, ".jpg")).toBeNull();
  });

  it("returns null when no file carries the hash", () => {
    expect(findAssetFilenameByContentHash(existing, HASH_B, ".png")).toBeNull();
    expect(findAssetFilenameByContentHash([], HASH_A, ".png")).toBeNull();
  });
});

describe("resolveAssetFilename", () => {
  it("accepts a flat filename", () => {
    expect(resolveAssetFilename("clip-ab12cd34.mp4")).toBe("clip-ab12cd34.mp4");
  });

  it("rejects path traversal attempts", () => {
    expect(resolveAssetFilename("../../etc/passwd")).toBeNull();
  });

  it("rejects nested paths", () => {
    expect(resolveAssetFilename("sub/dir/file.png")).toBeNull();
    expect(resolveAssetFilename("sub\\dir\\file.png")).toBeNull();
  });

  it("rejects an empty filename", () => {
    expect(resolveAssetFilename("")).toBeNull();
  });
});
