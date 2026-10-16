// The rewrite exercise (SLJ-146): the student writes a sentence (or a few),
// and it's right when it matches any of the teacher's solutions. Both sides
// are compared after the same normalizing, so spacing, the kind of quotes
// and, if the teacher allows, capitals and diacritics don't matter.
// Punctuation and word order still do. Pure: used by the runtime and the UI.

export type RewriteOptions = {
  // Letters without diacritics count as the letters with them (č → c, đ → dj).
  acceptWithoutDiacritics?: boolean;
  // Capital letters must match too.
  matchCase?: boolean;
  // The kind of quotes must match too („ “ vs " vs ,,).
  matchQuotes?: boolean;
};

const DIACRITICS: Record<string, string> = { Č: "C", Ć: "C", Đ: "Dj", Š: "S", Ž: "Z", č: "c", ć: "c", đ: "dj", š: "s", ž: "z" };

export function normalizeRewrite(text: string, options: RewriteOptions = {}): string {
  let result = text.replace(/[’‘]/g, "'");
  if (!options.matchQuotes) result = result.replace(/,,|''|[„“”«»"]/g, '"');
  result = result
    .replace(/\s+/g, " ")
    .replace(/ ([,.:;?!])/g, "$1")
    .trim();
  if (options.acceptWithoutDiacritics) result = result.replace(/[ČĆĐŠŽčćđšž]/g, (letter) => DIACRITICS[letter]);
  return options.matchCase ? result : result.toLocaleLowerCase();
}

export function matchesRewrite(answer: string, solutions: readonly string[], options: RewriteOptions = {}): boolean {
  const given = normalizeRewrite(answer, options);
  return given.length > 0 && solutions.some((solution) => normalizeRewrite(solution, options) === given);
}

// Edit distance between two texts (characters added, removed or changed).
function distance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

// The solution nearest to what the student wrote, to show as the correct
// answer; the first one when nothing was written.
export function closestRewriteSolution(answer: string, solutions: readonly string[], options: RewriteOptions = {}): string {
  const given = normalizeRewrite(answer, options);
  if (!given || solutions.length === 0) return solutions[0] ?? "";
  let best = solutions[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const solution of solutions) {
    const candidate = distance(given, normalizeRewrite(solution, options));
    if (candidate < bestDistance) {
      best = solution;
      bestDistance = candidate;
    }
  }
  return best;
}

// Ruled lines to write on, on paper: about 60 characters a line, for the
// longest solution, 1 to 6 lines.
export function rewritePrintRows(solutions: readonly string[]): number {
  const longest = Math.max(0, ...solutions.map((solution) => solution.length));
  return Math.min(6, Math.max(1, Math.ceil(longest / 60)));
}
