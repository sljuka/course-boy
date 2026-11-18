import type { FormulaAstNode } from "./types";

// Every variable name a formula uses, in order, with repeats.
export function collectFormulaVariables(node: FormulaAstNode): string[] {
  switch (node.type) {
    case "variable":
      return [node.name];
    case "binary":
      return [...collectFormulaVariables(node.left), ...collectFormulaVariables(node.right)];
    case "negate":
      return collectFormulaVariables(node.operand);
    case "number":
      return [];
  }
}
