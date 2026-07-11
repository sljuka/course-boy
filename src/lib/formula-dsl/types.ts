export type FormulaAstNode =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "negate"; operand: FormulaAstNode }
  | {
      type: "binary";
      operator: "+" | "-" | "*" | "/";
      left: FormulaAstNode;
      right: FormulaAstNode;
    };

export type FormulaVariables = Record<string, number>;

export type FormulaToken =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "(" | ")" };
