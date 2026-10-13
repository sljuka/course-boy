import { useQueries } from "@tanstack/react-query";

// Whether courses not on this computer can be downloaded right now, and from
// how many people (SLJ-127), for a program's or channel's page. Each is looked
// up online without importing it (`programs.peekCourse`); nobody having it
// online takes the whole lookup's time (about 20 s), so only a few run at
// once, and each is checked again every minute while the page is open.

const MAX_AT_ONCE = 3;
const RECHECK_MS = 60_000;

let running = 0;
const waiting: (() => void)[] = [];

async function limited<T>(run: () => Promise<T>): Promise<T> {
  if (running >= MAX_AT_ONCE) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await run();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

// How many people have it online (0: nobody right now), or undefined while
// the first check runs. A failed lookup counts as nobody.
export type CourseAvailability = Record<string, number | undefined>;

export function useCourseAvailability(codes: string[]): CourseAvailability {
  const results = useQueries({
    queries: codes.map((code) => ({
      queryKey: ["courses", "availability", code],
      queryFn: () =>
        limited(async () => {
          const result = await window.programs.peekCourse(code).catch(() => null);
          return result && "course" in result ? result.peers : 0;
        }),
      refetchInterval: RECHECK_MS,
      staleTime: RECHECK_MS / 2,
    })),
  });
  return Object.fromEntries(codes.map((code, index) => [code, results[index]?.data]));
}
