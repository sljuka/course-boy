import { describe, expect, it } from "vitest";

import {
  assetExtensionsByKind,
  assetMimeTypesByExtension,
  createAssetFilename,
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

describe("createAssetFilename", () => {
  it("slugifies the base name and keeps the original extension", () => {
    const filename = createAssetFilename("My Vacation Photo.PNG");

    expect(filename).toMatch(/^my-vacation-photo-[a-z0-9]{8}\.png$/);
  });

  it("produces different filenames for repeated uploads of the same name", () => {
    const first = createAssetFilename("clip.mp4");
    const second = createAssetFilename("clip.mp4");

    expect(first).not.toBe(second);
  });

  it("falls back to a generic base name when nothing slugifiable remains", () => {
    const filename = createAssetFilename("???.mp3");

    expect(filename).toMatch(/^asset-[a-z0-9]{8}\.mp3$/);
  });

  it("handles filenames with no extension", () => {
    const filename = createAssetFilename("README");

    expect(filename).toMatch(/^readme-[a-z0-9]{8}$/);
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
