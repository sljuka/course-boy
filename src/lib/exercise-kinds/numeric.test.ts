import { describe, expect, it } from "vitest";

import { rollVariableValue } from "@/lib/exercise-kinds/numeric";

describe("rollVariableValue", () => {
  it("stays within range with no parity constraint", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = rollVariableValue({ max: 10, min: 5, type: "integer" });

      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it("only produces even values when parity is even", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = rollVariableValue({ max: 20, min: 1, parity: "even", type: "integer" });

      expect(value % 2).toBe(0);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
    }
  });

  it("only produces odd values when parity is odd", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = rollVariableValue({ max: 20, min: 1, parity: "odd", type: "integer" });

      expect(Math.abs(value % 2)).toBe(1);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(20);
    }
  });

  it("falls back to a deterministic valid value for a single-value range", () => {
    expect(rollVariableValue({ max: 4, min: 4, parity: "even", type: "integer" })).toBe(4);
  });
});
