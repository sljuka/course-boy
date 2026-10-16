import { describe, expect, it } from "vitest";

import { closestRewriteSolution, matchesRewrite, normalizeRewrite, rewritePrintRows } from "@/lib/rewrite";

// SLJ-146: a written answer against the teacher's solutions.
describe("normalizeRewrite", () => {
  it("ignores spacing, the kind of quotes and capitals by default", () => {
    expect(normalizeRewrite('  Nena reče :  ,,Kupiću hleb.\'\'  ')).toBe('nena reče: "kupiću hleb."');
    expect(normalizeRewrite("Nena reče: „Kupiću hleb.“")).toBe('nena reče: "kupiću hleb."');
  });

  it("keeps capitals and quotes when asked, and drops diacritics when allowed", () => {
    expect(normalizeRewrite("Nena „Kupiću“", { matchCase: true, matchQuotes: true })).toBe("Nena „Kupiću“");
    expect(normalizeRewrite("Đak čita, Žika ćuti", { acceptWithoutDiacritics: true })).toBe("djak cita, zika cuti");
  });
});

describe("matchesRewrite", () => {
  const solutions = ["Nena reče: „Kupiću hleb.“", "„Kupiću hleb“, reče Nena."];

  it("is right when it matches any solution", () => {
    expect(matchesRewrite('nena reče: "Kupiću hleb."', solutions)).toBe(true);
    expect(matchesRewrite("„Kupiću hleb“ , reče Nena.", solutions)).toBe(true);
  });

  it("still counts punctuation, word order and diacritics unless allowed", () => {
    expect(matchesRewrite("Nena reče „Kupiću hleb.“", solutions)).toBe(false);
    expect(matchesRewrite("Kupiću hleb, reče Nena.", solutions)).toBe(false);
    expect(matchesRewrite("Nena rece: „Kupicu hleb.“", solutions)).toBe(false);
    expect(matchesRewrite("Nena rece: „Kupicu hleb.“", solutions, { acceptWithoutDiacritics: true })).toBe(true);
    expect(matchesRewrite("   ", solutions)).toBe(false);
  });
});

describe("closestRewriteSolution", () => {
  it("picks the solution nearest to what was written", () => {
    const solutions = ["Nena reče: „Kupiću hleb.“", "„Kupiću hleb“, reče Nena."];
    expect(closestRewriteSolution("Kupiću hleb reče Nena", solutions)).toBe(solutions[1]);
    expect(closestRewriteSolution("", solutions)).toBe(solutions[0]);
  });
});

describe("rewritePrintRows", () => {
  it("gives a line per 60 characters, 1 to 6", () => {
    expect(rewritePrintRows(["Kratko."])).toBe(1);
    expect(rewritePrintRows(["x".repeat(130)])).toBe(3);
    expect(rewritePrintRows(["x".repeat(1000)])).toBe(6);
  });
});
