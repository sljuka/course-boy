import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  assetFilenameFromRelativePath,
  createReferencedFilesFilter,
  getCourseAssetUsage,
  partitionAssetsByUsage,
} from "./course-asset-usage";

describe("partitionAssetsByUsage", () => {
  it("splits assets by whether any text mentions their filename", () => {
    const usage = partitionAssetsByUsage(
      ["map-aaaa.svg", "clip-bbbb.mp4", "photo-cccc.png"],
      ['{"asset":"map-aaaa.svg"}', "![](photo-cccc.png)"],
    );

    expect([...usage.referenced].sort()).toEqual(["map-aaaa.svg", "photo-cccc.png"]);
    expect(usage.unreferenced).toEqual(["clip-bbbb.mp4"]);
  });

  it("treats every asset as unreferenced when there is no text", () => {
    expect(partitionAssetsByUsage(["b.png", "a.png"], []).unreferenced).toEqual([
      "a.png",
      "b.png",
    ]);
  });
});

describe("assetFilenameFromRelativePath", () => {
  it("returns the filename for direct children of assets/", () => {
    expect(assetFilenameFromRelativePath(path.join("assets", "map.svg"))).toBe("map.svg");
  });

  it("returns null for anything else", () => {
    expect(assetFilenameFromRelativePath("course.json")).toBeNull();
    expect(assetFilenameFromRelativePath(path.join("section-01", "section.json"))).toBeNull();
    expect(assetFilenameFromRelativePath(path.join("section-01", "assets", "x.png"))).toBeNull();
    expect(assetFilenameFromRelativePath(path.join("assets", "nested", "x.png"))).toBeNull();
  });
});

describe("getCourseAssetUsage", () => {
  let packageDir = "";

  async function writePackageFile(relativePath: string, contents: string): Promise<void> {
    const filePath = path.join(packageDir, relativePath);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents);
  }

  beforeEach(async () => {
    packageDir = await fs.mkdtemp(path.join(os.tmpdir(), "matko-asset-usage-"));
  });

  afterEach(async () => {
    await fs.rm(packageDir, { force: true, recursive: true });
  });

  it("finds references in nested lesson markdown and JSON, not in version-meta.json", async () => {
    await writePackageFile("assets/map-aaaa.svg", "<svg/>");
    await writePackageFile("assets/clip-bbbb.mp4", "video");
    await writePackageFile("assets/unused-cccc.png", "png");
    await writePackageFile("course.json", "{}");
    await writePackageFile("section-01-a/locales/en/lesson-01-a.md", "![](clip-bbbb.mp4)");
    await writePackageFile("section-01-a/test-01-a.json", '{"svg":"map-aaaa.svg"}');
    await writePackageFile(
      "version-meta.json",
      '{"fileHashes":{"assets/unused-cccc.png":"x"}}',
    );

    const usage = await getCourseAssetUsage(packageDir);

    expect([...usage.referenced].sort()).toEqual(["clip-bbbb.mp4", "map-aaaa.svg"]);
    expect(usage.unreferenced).toEqual(["unused-cccc.png"]);
  });

  it("ignores dotfiles in assets/ and handles a package without assets/", async () => {
    await writePackageFile("course.json", "{}");

    expect(await getCourseAssetUsage(packageDir)).toEqual({
      referenced: new Set(),
      unreferenced: [],
    });

    await writePackageFile("assets/.DS_Store", "junk");

    expect((await getCourseAssetUsage(packageDir)).unreferenced).toEqual([]);
  });

  it("builds a filter that keeps non-asset files and referenced assets only", async () => {
    await writePackageFile("assets/used-aaaa.png", "png");
    await writePackageFile("assets/unused-bbbb.png", "png");
    await writePackageFile("course.json", '{"cover":"used-aaaa.png"}');

    const includeFile = createReferencedFilesFilter(await getCourseAssetUsage(packageDir));

    expect(includeFile("course.json")).toBe(true);
    expect(includeFile(path.join("assets", "used-aaaa.png"))).toBe(true);
    expect(includeFile(path.join("assets", "unused-bbbb.png"))).toBe(false);
    expect(includeFile(path.join("assets", ".DS_Store"))).toBe(false);
  });
});
