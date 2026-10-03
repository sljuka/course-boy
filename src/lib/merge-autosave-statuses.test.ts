import { describe, expect, it } from "vitest";

import { mergeAutosaveStatuses } from "@/lib/use-entity-autosave";

describe("mergeAutosaveStatuses", () => {
  it("reports the most urgent status", () => {
    expect(mergeAutosaveStatuses(["saved", "saved"])).toBe("saved");
    expect(mergeAutosaveStatuses(["saved", "dirty"])).toBe("dirty");
    expect(mergeAutosaveStatuses(["dirty", "saving"])).toBe("saving");
    expect(mergeAutosaveStatuses(["saving", "error"])).toBe("error");
  });
});
