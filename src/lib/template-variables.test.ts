import { describe, expect, it } from "vitest";

import { findTemplateVariables, replaceTemplateVariables } from "./template-variables";

describe("template variables", () => {
  it("accepts spaces inside the braces", () => {
    expect(findTemplateVariables("{{ x }} + {{y}}")).toEqual(["x", "y"]);
    expect(replaceTemplateVariables("{{ x }} + {{y}}", (name) => (name === "x" ? "3" : "27"))).toBe(
      "3 + 27",
    );
  });

  it("lists each variable once, in order of first appearance", () => {
    expect(findTemplateVariables("{{b}} {{a}} {{ b }}")).toEqual(["b", "a"]);
  });

  it("ignores placeholders that aren't identifiers", () => {
    expect(findTemplateVariables("{{my-var}} {{1x}} {{}}")).toEqual([]);
    expect(replaceTemplateVariables("{{my-var}}", () => "?")).toBe("{{my-var}}");
  });
});
