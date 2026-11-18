import { describe, expect, it } from "vitest";

import {
  fillTemplate,
  findInvalidPlaceholders,
  findTemplateVariables,
  formatTemplateValue,
} from "./template-variables";

const NBSP = " ";

describe("template variables", () => {
  it("accepts spaces inside the braces", () => {
    expect(findTemplateVariables("{{ x }} + {{y}}")).toEqual(["x", "y"]);
    expect(fillTemplate("{{ x }} + {{y}}", { x: 3, y: 27 })).toBe("3 + 27");
  });

  it("lists each variable once, in order of first appearance", () => {
    expect(findTemplateVariables("{{b}} {{a}} {{ b }}")).toEqual(["b", "a"]);
  });

  // SLJ-233: a number calculated from the drawn ones.
  it("lists the variables a formula uses, and fills in its value", () => {
    expect(findTemplateVariables("{{a * 100}} cm² = ___ dm², and {{ (b - a) / 2 }}")).toEqual(["a", "b"]);
    expect(fillTemplate("{{a * 100}} cm² = ___ dm²", { a: 85 })).toBe("8500 cm² = ___ dm²");
    expect(fillTemplate("{{a * 100}} and {{a}}", { a: 85 }, (value) => `**${value}**`)).toBe("**8500** and **85**");
  });

  it("leaves braces that aren't a formula as written, and lists them for the editor", () => {
    expect(findTemplateVariables("{{1x}} {{}} {{a +}}")).toEqual([]);
    expect(fillTemplate("{{1x}} {{}} {{a +}}", { a: 1 })).toBe("{{1x}} {{}} {{a +}}");
    expect(findInvalidPlaceholders("{{a}} {{1x}} {{}} {{1x}}")).toEqual(["{{1x}}", "{{}}"]);
    expect(findInvalidPlaceholders("{{a * 100}} {{ b }}")).toEqual([]);
  });

  it("leaves a placeholder it can't calculate as written", () => {
    expect(fillTemplate("{{a / (b - b)}}", { a: 1, b: 2 })).toBe("{{a / (b - b)}}");
    expect(fillTemplate("{{missing}}", {})).toBe("{{missing}}");
  });

  it("sets apart the thousands of numbers longer than four digits", () => {
    expect(formatTemplateValue(8500)).toBe("8500");
    expect(formatTemplateValue(2024)).toBe("2024");
    expect(formatTemplateValue(45000)).toBe(`45${NBSP}000`);
    expect(formatTemplateValue(45000000)).toBe(`45${NBSP}000${NBSP}000`);
    expect(formatTemplateValue(-123456)).toBe(`-123${NBSP}456`);
  });

  it("rounds results that aren't whole, without floating-point noise", () => {
    expect(formatTemplateValue(0.1 * 3)).toBe("0.3");
    expect(formatTemplateValue(10 / 4)).toBe("2.5");
    expect(formatTemplateValue(1 / 3)).toBe("0.333333");
    expect(formatTemplateValue(12345.5)).toBe(`12${NBSP}345.5`);
  });
});
