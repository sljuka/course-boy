import { FormulaError } from "./errors";
import type {
  FormulaAstNode,
  FormulaVariables,
} from "./types";

export function evaluateFormulaAst(
  node: FormulaAstNode,
  variables: FormulaVariables,
): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "variable": {
      if (!(node.name in variables)) {
        throw new FormulaError(`Unknown variable "${node.name}"`, "exerciseCheck.formula.unknownVariable", {
          name: node.name,
        });
      }

      const value = variables[node.name];

      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new FormulaError(`Variable "${node.name}" must be a valid number`, "exerciseCheck.formula.notANumber", {
          name: node.name,
        });
      }

      return value;
    }
    case "negate":
      return -evaluateFormulaAst(node.operand, variables);
    case "binary": {
      const left = evaluateFormulaAst(node.left, variables);
      const right = evaluateFormulaAst(node.right, variables);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) {
            throw new FormulaError("Division by zero", "exerciseCheck.formula.divisionByZero");
          }

          return left / right;
      }
    }
  }
}
