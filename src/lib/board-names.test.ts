import { describe, expect, it } from "vitest";

import { boardDisplayName, generatedBoardName } from "@/lib/board-names";

describe("board names", () => {
  it("makes the same name from the same key, agreeing in Serbian", () => {
    const otter = "0000" + "0000" + "ff".repeat(28);
    const bear = "0000" + "0003" + "ff".repeat(28);
    expect(generatedBoardName(otter, "en")).toBe("Blue Otter");
    expect(generatedBoardName(otter, "sr")).toBe("Plava vidra");
    expect(generatedBoardName(bear, "sr")).toBe("Plavi medved");
    expect(generatedBoardName(bear, "sr-Cyrl")).toBe("Плави медвед");
  });

  it("prefers the name the sender typed", () => {
    expect(boardDisplayName({ author: "00".repeat(32), name: " Ana " }, "en")).toBe("Ana");
    expect(boardDisplayName({ author: "00".repeat(32), name: "" }, "en")).toBe("Blue Otter");
  });
});
