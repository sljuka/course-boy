import { evaluateFormulaAst } from "./evaluate";
import { parseFormula } from "./parse";

export type {
  FormulaAstNode,
  FormulaToken,
  FormulaVariables,
} from "./types";

export { evaluateFormulaAst, parseFormula };

export function evaluateFormula(
  formula: string,
  variables: Record<string, number>,
): number {
  return evaluateFormulaAst(parseFormula(formula), variables);
}
