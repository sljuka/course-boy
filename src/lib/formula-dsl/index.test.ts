import { describe, expect, it } from "vitest";

import {
  evaluateFormula,
  evaluateFormulaAst,
  parseFormula,
} from "@/lib/formula-dsl";
import { tokenizeFormula } from "@/lib/formula-dsl/tokenize";

describe("tokenizeFormula", () => {
  it("tokenizes numbers, variables, and operators", () => {
    expect(tokenizeFormula("a + 12.5 * (b - 3)")).toEqual([
      { type: "identifier", value: "a" },
      { type: "operator", value: "+" },
      { type: "number", value: 12.5 },
      { type: "operator", value: "*" },
      { type: "operator", value: "(" },
      { type: "identifier", value: "b" },
      { type: "operator", value: "-" },
      { type: "number", value: 3 },
      { type: "operator", value: ")" },
    ]);
  });

  it("rejects unexpected characters", () => {
    expect(() => tokenizeFormula("a + $")).toThrow(/Unexpected token/);
  });
});

describe("parseFormula", () => {
  it("respects operator precedence", () => {
    expect(parseFormula("a + b * 2")).toEqual({
      type: "binary",
      operator: "+",
      left: { type: "variable", name: "a" },
      right: {
        type: "binary",
        operator: "*",
        left: { type: "variable", name: "b" },
        right: { type: "number", value: 2 },
      },
    });
  });

  it("supports unary minus and parentheses", () => {
    expect(parseFormula("-(a + 4)")).toEqual({
      type: "negate",
      operand: {
        type: "binary",
        operator: "+",
        left: { type: "variable", name: "a" },
        right: { type: "number", value: 4 },
      },
    });
  });

  it("rejects incomplete expressions", () => {
    expect(() => parseFormula("a +")).toThrow("Unexpected end of formula");
  });
});

describe("evaluateFormulaAst", () => {
  it("evaluates a parsed expression with variables", () => {
    const ast = parseFormula("(a + b) / c");

    expect(evaluateFormulaAst(ast, { a: 8, b: 4, c: 3 })).toBe(4);
  });

  it("throws on unknown variables", () => {
    expect(() => evaluateFormulaAst(parseFormula("a + b"), { a: 1 })).toThrow(
      'Unknown variable "b"',
    );
  });

  it("throws on division by zero", () => {
    expect(() =>
      evaluateFormulaAst(parseFormula("a / b"), { a: 5, b: 0 }),
    ).toThrow("Division by zero");
  });
});

describe("evaluateFormula", () => {
  it("parses and evaluates in one call", () => {
    expect(evaluateFormula("x * (y - 1)", { x: 6, y: 5 })).toBe(24);
  });
});
