import { describe, expect, it } from "vitest";

import { countCharacters, SECTION_SUMMARY_MAX_LENGTH, truncateSummary } from "@/lib/section-summary";

describe("section summary", () => {
  it("counts characters as people see them", () => {
    expect(countCharacters("Razlomci")).toBe(8);
    expect(countCharacters("Разломци")).toBe(8);
    expect(countCharacters("👨‍👩‍👧 family")).toBe(8);
  });

  it("leaves a summary within the limit as it is", () => {
    const summary = "a".repeat(SECTION_SUMMARY_MAX_LENGTH);
    expect(truncateSummary(summary)).toBe(summary);
  });

  it("cuts a longer one off with an ellipsis, within the limit", () => {
    const long = `${"word ".repeat(40)}end`;
    const cut = truncateSummary(long);

    expect(cut.endsWith("…")).toBe(true);
    expect(countCharacters(cut)).toBeLessThanOrEqual(SECTION_SUMMARY_MAX_LENGTH);
  });

  it("never splits an emoji", () => {
    expect(truncateSummary("👨‍👩‍👧👨‍👩‍👧👨‍👩‍👧", 2)).toBe("👨‍👩‍👧…");
  });
});
