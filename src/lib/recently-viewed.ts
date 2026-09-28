// "Recently viewed" in the window title bar: the courses a user opened last,
// newest first. Per-device user state, so it lives in the preferences store
// (electron-store) rather than in any course package — see
// docs/persistence-notes.md. Kept free of React/router imports because the
// main process uses `parseRecentlyViewedEntries` to validate what the renderer
// sends before persisting it.

export type RecentlyViewedKind = "course" | "draft" | "lesson";

export type RecentlyViewedEntry = {
  courseId: string;
  kind: RecentlyViewedKind;
  // The exact in-app route to reopen, e.g. "/courses/x/lessons/y".
  path: string;
  viewedAt: string;
};

export const MAX_RECENTLY_VIEWED = 8;

const RECENTLY_VIEWED_KINDS = new Set<RecentlyViewedKind>(["course", "draft", "lesson"]);
const MAX_PATH_LENGTH = 512;

// One entry per course *and* kind: opening five lessons of the same course
// keeps a single "lesson" entry pointing at the latest one, rather than
// crowding every other course out of the list.
export function recordRecentlyViewed(
  entries: readonly RecentlyViewedEntry[],
  entry: RecentlyViewedEntry,
): RecentlyViewedEntry[] {
  return [
    entry,
    ...entries.filter(
      (existing) => existing.courseId !== entry.courseId || existing.kind !== entry.kind,
    ),
  ].slice(0, MAX_RECENTLY_VIEWED);
}

function isRecentlyViewedEntry(value: unknown): value is RecentlyViewedEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.courseId === "string" &&
    candidate.courseId.length > 0 &&
    typeof candidate.kind === "string" &&
    RECENTLY_VIEWED_KINDS.has(candidate.kind as RecentlyViewedKind) &&
    typeof candidate.path === "string" &&
    candidate.path.startsWith("/") &&
    candidate.path.length <= MAX_PATH_LENGTH &&
    typeof candidate.viewedAt === "string"
  );
}

// Drops anything malformed and caps the length — the preferences store only
// ever persists what passes here.
export function parseRecentlyViewedEntries(value: unknown): RecentlyViewedEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecentlyViewedEntry)
    .slice(0, MAX_RECENTLY_VIEWED)
    .map(({ courseId, kind, path, viewedAt }) => ({ courseId, kind, path, viewedAt }));
}
