import { tokenizeFormula } from "./tokenize";
import type { FormulaAstNode, FormulaToken } from "./types";

class FormulaParser {
  private currentIndex = 0;

  constructor(private readonly tokens: FormulaToken[]) {}

  parse(): FormulaAstNode {
    const expression = this.parseExpression();

    if (!this.isAtEnd()) {
      throw new Error("Unexpected trailing tokens in formula");
    }

    return expression;
  }

  private parseExpression(): FormulaAstNode {
    let node = this.parseTerm();

    while (this.matchesOperator("+") || this.matchesOperator("-")) {
      const operator = this.previousOperatorValue("+", "-");
      const right = this.parseTerm();

      node = {
        type: "binary",
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseTerm(): FormulaAstNode {
    let node = this.parseFactor();

    while (this.matchesOperator("*") || this.matchesOperator("/")) {
      const operator = this.previousOperatorValue("*", "/");
      const right = this.parseFactor();

      node = {
        type: "binary",
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseFactor(): FormulaAstNode {
    if (this.matchesOperator("-")) {
      return {
        type: "negate",
        operand: this.parseFactor(),
      };
    }

    if (this.matchesOperator("(")) {
      const expression = this.parseExpression();

      if (!this.matchesOperator(")")) {
        throw new Error('Expected closing ")"');
      }

      return expression;
    }

    const currentToken = this.peek();

    if (!currentToken) {
      throw new Error("Unexpected end of formula");
    }

    if (currentToken.type === "number") {
      this.currentIndex += 1;
      return { type: "number", value: currentToken.value };
    }

    if (currentToken.type === "identifier") {
      this.currentIndex += 1;
      return { type: "variable", name: currentToken.value };
    }

    throw new Error("Expected a number, variable, or parenthesized expression");
  }

  private matchesOperator(
    expected: FormulaToken["value"] & ("+" | "-" | "*" | "/" | "(" | ")"),
  ): boolean {
    const currentToken = this.peek();

    if (
      !currentToken ||
      currentToken.type !== "operator" ||
      currentToken.value !== expected
    ) {
      return false;
    }

    this.currentIndex += 1;
    return true;
  }

  private previousOperatorValue<
    TOperator extends "+" | "-" | "*" | "/",
  >(...allowedOperators: TOperator[]): TOperator {
    const previousToken = this.tokens[this.currentIndex - 1];

    if (
      previousToken?.type !== "operator" ||
      !allowedOperators.includes(previousToken.value as TOperator)
    ) {
      throw new Error("Internal parser state error");
    }

    return previousToken.value as TOperator;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.currentIndex];
  }

  private isAtEnd(): boolean {
    return this.currentIndex >= this.tokens.length;
  }
}

export function parseFormula(formula: string): FormulaAstNode {
  const tokens = tokenizeFormula(formula);
  return new FormulaParser(tokens).parse();
}
