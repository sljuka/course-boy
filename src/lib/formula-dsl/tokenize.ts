import type { FormulaToken } from "./types";

const numberPattern = /^(?:\d+\.?\d*|\.\d+)/;
const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*/;
type FormulaOperator = Extract<FormulaToken, { type: "operator" }>["value"];
const operatorCharacters: FormulaOperator[] = ["+", "-", "*", "/", "(", ")"];

export function tokenizeFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let currentIndex = 0;

  while (currentIndex < formula.length) {
    const currentChunk = formula.slice(currentIndex);

    if (/^\s+/.test(currentChunk)) {
      currentIndex += currentChunk.match(/^\s+/)?.[0].length ?? 0;
      continue;
    }

    const numberMatch = currentChunk.match(numberPattern);

    if (numberMatch) {
      tokens.push({ type: "number", value: Number(numberMatch[0]) });
      currentIndex += numberMatch[0].length;
      continue;
    }

    const identifierMatch = currentChunk.match(identifierPattern);

    if (identifierMatch) {
      tokens.push({ type: "identifier", value: identifierMatch[0] });
      currentIndex += identifierMatch[0].length;
      continue;
    }

    const currentCharacter = currentChunk[0];

    if (
      currentCharacter &&
      operatorCharacters.includes(currentCharacter as FormulaOperator)
    ) {
      tokens.push({
        type: "operator",
        value: currentCharacter as FormulaOperator,
      });
      currentIndex += 1;
      continue;
    }

    throw new Error(`Unexpected token near "${currentChunk.slice(0, 12)}"`);
  }

  return tokens;
}
