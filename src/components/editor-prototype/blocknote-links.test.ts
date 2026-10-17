import { describe, expect, it } from "vitest";
import { VALID_LINK_PROTOCOLS } from "@blocknote/core/extensions";

import { blockNoteLinkOptions, repairAppLinks } from "@/components/editor-prototype/blocknote-links";

describe("matko links in BlockNote", () => {
  it("keeps BlockNote's link field from putting https:// in front of them", () => {
    expect(VALID_LINK_PROTOCOLS).toContain("matko");
    expect(blockNoteLinkOptions.isValidLink("matko://lesson/lesson-01")).toBe(true);
  });

  it("mends links the link field broke, and leaves web links alone", () => {
    expect(repairAppLinks("[Pauze](https://matko://lesson/lesson-pauze-8oty)")).toBe(
      "[Pauze](matko://lesson/lesson-pauze-8oty)",
    );
    expect(repairAppLinks("[A](HTTP://matko://course/abc) [B](https://example.com/matko://x)")).toBe(
      "[A](matko://course/abc) [B](https://example.com/matko://x)",
    );
  });
});
