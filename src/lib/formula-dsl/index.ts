import { evaluateFormulaAst } from "@/lib/formula-dsl/evaluate";
import { parseFormula } from "@/lib/formula-dsl/parse";

export type {
  FormulaAstNode,
  FormulaToken,
  FormulaVariables,
} from "@/lib/formula-dsl/types";

export { evaluateFormulaAst, parseFormula };

export function evaluateFormula(
  formula: string,
  variables: Record<string, number>,
): number {
  return evaluateFormulaAst(parseFormula(formula), variables);
}
