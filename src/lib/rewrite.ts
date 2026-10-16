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

// A piece of a text as compared with another (SLJ-146): `changed` when it's a
// word or mark the other doesn't have in that place. The pieces in order
// give back the text exactly, spaces included.
export type RewriteSegment = { changed: boolean; text: string };

// Words (with inner apostrophes or hyphens), two-character quotes, and every
// other mark on its own: „ and : count as much as a word.
const TOKEN = /,,|''|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|\S/gu;

function tokenize(text: string): { end: number; start: number; text: string }[] {
  return Array.from(text.matchAll(TOKEN), (match) => ({
    end: match.index + match[0].length,
    start: match.index,
    text: match[0],
  }));
}

// Which of the text's tokens are in the common part, as pieces of the text.
function toSegments(text: string, tokens: { end: number; start: number }[], kept: boolean[]): RewriteSegment[] {
  const segments: RewriteSegment[] = [];
  let at = 0;
  tokens.forEach((token, index) => {
    if (token.start > at) segments.push({ changed: false, text: text.slice(at, token.start) });
    segments.push({ changed: !kept[index], text: text.slice(token.start, token.end) });
    at = token.end;
  });
  if (at < text.length) segments.push({ changed: false, text: text.slice(at) });
  return segments;
}

// What differs between the student's answer and a solution, word by word:
// the longest run of words both have in the same order is the same, the
// rest is marked (in the answer, what to fix; in the solution, what was
// missing). Words compare as the whole answer does (`normalizeRewrite`).
export function diffRewrite(
  answer: string,
  solution: string,
  options: RewriteOptions = {},
): { answer: RewriteSegment[]; solution: RewriteSegment[] } {
  const left = tokenize(answer);
  const right = tokenize(solution);
  const leftKeys = left.map((token) => normalizeRewrite(token.text, options));
  const rightKeys = right.map((token) => normalizeRewrite(token.text, options));

  // lengths[i][j]: the longest common run of left[i..] and right[j..].
  const lengths = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i][j] =
        leftKeys[i] === rightKeys[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const leftKept = new Array<boolean>(left.length).fill(false);
  const rightKept = new Array<boolean>(right.length).fill(false);
  for (let i = 0, j = 0; i < left.length && j < right.length; ) {
    if (leftKeys[i] === rightKeys[j]) {
      leftKept[i] = true;
      rightKept[j] = true;
      i += 1;
      j += 1;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return { answer: toSegments(answer, left, leftKept), solution: toSegments(solution, right, rightKept) };
}
