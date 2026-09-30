// `{{name}}` placeholders in a numeric exercise's prompt and hints. One
// definition for the editor (which variables to offer ranges for), the
// runtime (which variables to randomize) and the player (where to put the
// values) — they used to disagree, so `{{ x }}` got a range in the editor but
// was shown literally in the test.
//
// Spaces inside the braces are allowed. Names are identifiers (letter or
// underscore, then letters, digits, underscores) because they also appear in
// the answer formula, where `a-b` would read as subtraction.
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;

// Variable names in order of first appearance, without duplicates.
export function findTemplateVariables(template: string): string[] {
  return [...new Set([...template.matchAll(TEMPLATE_VARIABLE_PATTERN)].map((match) => match[1]))];
}

export function replaceTemplateVariables(
  template: string,
  replace: (variableName: string) => string,
): string {
  return template.replace(TEMPLATE_VARIABLE_PATTERN, (_match, variableName: string) =>
    replace(variableName),
  );
}
