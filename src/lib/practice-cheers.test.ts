import { describe, expect, it } from "vitest";

import { pickCheerKey } from "@/lib/practice-cheers";

describe("pickCheerKey", () => {
  it("picks from the perfect set only for a perfect run", () => {
    expect(pickCheerKey(true, () => 0)).toBe("courseDetails.practiceCheerPerfect1");
    expect(pickCheerKey(true, () => 0.99)).toBe("courseDetails.practiceCheerPerfect3");
    expect(pickCheerKey(false, () => 0)).toBe("courseDetails.practiceCheer1");
    expect(pickCheerKey(false, () => 0.99)).toBe("courseDetails.practiceCheer6");
  });
});
