import { collectFormulaVariables, evaluateFormulaAst, parseFormula, type FormulaAstNode } from "./formula-dsl";

// `{{…}}` placeholders in a numeric exercise's prompt and hints. One
// definition for the editor (which variables to offer ranges for), the
// runtime (which variables to randomize) and the player (where to put the
// values) — they used to disagree, so `{{ x }}` got a range in the editor but
// was shown literally in the test.
//
// A placeholder holds a variable (`{{a}}`) or a formula over variables, with
// the operators the answer formula has (`{{a * 100}}`, SLJ-233), so a prompt
// can show a number calculated from the drawn ones. Spaces inside the braces
// are allowed. Variable names are identifiers (letter or underscore, then
// letters, digits, underscores), as in the answer formula, where `a-b` reads
// as subtraction. Braces holding something that isn't a formula (`{{1x}}`,
// `{{}}`) aren't placeholders: the player shows them as written and the
// editor flags them.
const PLACEHOLDER_PATTERN = /\{\{([^{}]*)\}\}/g;

function parsePlaceholder(source: string): FormulaAstNode | null {
  if (!source.trim()) return null;

  try {
    return parseFormula(source);
  } catch {
    return null;
  }
}

// Variable names in order of first appearance, without duplicates, also those
// used inside formulas: these are the ones to draw values for.
export function findTemplateVariables(template: string): string[] {
  const names = [...template.matchAll(PLACEHOLDER_PATTERN)].flatMap((match) => {
    const formula = parsePlaceholder(match[1]);
    return formula ? collectFormulaVariables(formula) : [];
  });

  return [...new Set(names)];
}

// What's inside the braces of each `{{…}}` that isn't a formula, as written,
// without duplicates; for the editor to flag.
export function findInvalidPlaceholders(template: string): string[] {
  const invalid = [...template.matchAll(PLACEHOLDER_PATTERN)]
    .filter((match) => !parsePlaceholder(match[1]))
    .map((match) => match[0]);

  return [...new Set(invalid)];
}

// Each placeholder's formula (a variable is the simplest one), parsed, for
// checking it with sample values.
export function findPlaceholderFormulas(template: string): FormulaAstNode[] {
  return [...template.matchAll(PLACEHOLDER_PATTERN)].flatMap((match) => {
    const formula = parsePlaceholder(match[1]);
    return formula ? [formula] : [];
  });
}

// Bigger numbers get their thousands set apart by a (non-breaking) space, so a
// child can read them: 45 000 000. Four digits stay together, so a year (2024)
// or 8500 reads as usual. A result that isn't whole is rounded to six
// decimals, so 0.1 * 3 doesn't show as 0.30000000000000004.
export function formatTemplateValue(value: number): string {
  const rounded = Number(value.toFixed(6));
  const [whole, fraction] = String(Math.abs(rounded)).split(".");
  const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+$)/g, " ") : whole;

  return `${rounded < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

// Fills each placeholder with its value, formatted, passed through `wrap`
// (e.g. to make it bold). A placeholder that can't be calculated (a variable
// with no value, division by zero) is left as written.
export function fillTemplate(
  template: string,
  variables: Record<string, number>,
  wrap: (value: string) => string = (value) => value,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (placeholder, source: string) => {
    const formula = parsePlaceholder(source);
    if (!formula) return placeholder;

    try {
      return wrap(formatTemplateValue(evaluateFormulaAst(formula, variables)));
    } catch {
      return placeholder;
    }
  });
}
