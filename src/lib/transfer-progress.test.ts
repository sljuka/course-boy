import { describe, expect, it } from "vitest";

import { formatBytes, isNobodyOnline, NOBODY_ONLINE_AFTER_MS, transferPercent } from "@/lib/transfer-progress";

describe("transfer progress", () => {
  it("says nobody is online only after a while of finding", () => {
    expect(isNobodyOnline({ elapsedMs: 5_000, phase: "finding" })).toBe(false);
    expect(isNobodyOnline({ elapsedMs: NOBODY_ONLINE_AFTER_MS, phase: "finding" })).toBe(true);
    expect(isNobodyOnline({ elapsedMs: NOBODY_ONLINE_AFTER_MS * 2, phase: "downloading" })).toBe(false);
  });

  it("computes a percentage once the total is known", () => {
    expect(transferPercent({ bytesDone: 0, bytesTotal: null })).toBeNull();
    expect(transferPercent({ bytesDone: 25, bytesTotal: 100 })).toBe(25);
    expect(transferPercent({ bytesDone: 0, bytesTotal: 0 })).toBe(100);
  });

  it("formats sizes in the reader's language", () => {
    expect(formatBytes(12_345_678, "en")).toBe("12 MB");
    expect(formatBytes(2_500_000, "en")).toBe("2.5 MB");
    expect(formatBytes(850_000, "en")).toBe("850 kB");
    expect(formatBytes(2_500_000, "sr")).toContain("2,5");
  });
});
