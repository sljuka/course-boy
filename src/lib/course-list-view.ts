// How course lists draw their courses (My courses, Home, a program's page):
// compact rows ("table", Linear-style, the default), full-width cards
// ("list"), or small cards that wrap, 1-4 per row ("cards", SLJ-64). Per-device UI state, persisted in
// the preferences store, one choice per page. Kept free of React so the main process can validate what the
// renderer sends.

export type CourseListView = "cards" | "list" | "table";

// Every page starts on the table; a choice already made is kept.
export const DEFAULT_COURSE_LIST_VIEW: CourseListView = "table";
export const DEFAULT_HOME_VIEW: CourseListView = "table";

export function parseCourseListView(
  value: unknown,
  fallback: CourseListView = DEFAULT_COURSE_LIST_VIEW,
): CourseListView {
  return value === "cards" || value === "list" || value === "table" ? value : fallback;
}
