import { describe, expect, it } from "vitest";

import { NavigationType } from "react-router-dom";

import { nextHistoryPosition } from "./use-history-availability";

describe("nextHistoryPosition", () => {
  it("moves forward and drops the forward range on PUSH", () => {
    expect(nextHistoryPosition({ index: 1, maxIndex: 4 }, 2, NavigationType.Push)).toEqual({
      index: 2,
      maxIndex: 2,
    });
  });

  it("keeps the forward range when going back (POP)", () => {
    expect(nextHistoryPosition({ index: 3, maxIndex: 3 }, 2, NavigationType.Pop)).toEqual({
      index: 2,
      maxIndex: 3,
    });
  });

  it("extends the range when going forward to an entry beyond the known max", () => {
    expect(nextHistoryPosition({ index: 0, maxIndex: 0 }, 1, NavigationType.Pop)).toEqual({
      index: 1,
      maxIndex: 1,
    });
  });

  it("keeps position and range on REPLACE", () => {
    expect(nextHistoryPosition({ index: 2, maxIndex: 3 }, 2, NavigationType.Replace)).toEqual({
      index: 2,
      maxIndex: 3,
    });
  });
});
