import { describe, expect, it } from "vitest";

import { formatFileSize } from "./format-file-size";

describe("formatFileSize", () => {
  it("picks a readable unit", () => {
    expect(formatFileSize(512, "en")).toBe("512 B");
    expect(formatFileSize(12 * 1024, "en")).toBe("12 KB");
    expect(formatFileSize(3.4 * 1024 * 1024, "en")).toBe("3.4 MB");
    expect(formatFileSize(25 * 1024 * 1024, "en")).toBe("25 MB");
  });

  it("uses the locale's decimal separator", () => {
    expect(formatFileSize(3.4 * 1024 * 1024, "sr")).toBe("3,4 MB");
  });
});
