// How My courses and Home draw their courses: compact rows ("table",
// Linear-style) or the fuller cards ("list"). Per-device UI state, persisted in
// the preferences store, one choice per page. Kept free of React so the main process can validate what the
// renderer sends.

export type CourseListView = "list" | "table";

// My courses defaults to the table; Home keeps its cards until the student
// switches.
export const DEFAULT_COURSE_LIST_VIEW: CourseListView = "table";
export const DEFAULT_HOME_VIEW: CourseListView = "list";

export function parseCourseListView(
  value: unknown,
  fallback: CourseListView = DEFAULT_COURSE_LIST_VIEW,
): CourseListView {
  return value === "list" || value === "table" ? value : fallback;
}
