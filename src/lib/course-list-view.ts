// How My courses draws its courses: compact rows ("table", Linear-style) or
// the fuller cards ("list"). Per-device UI state, persisted in the preferences
// store. Kept free of React so the main process can validate what the
// renderer sends.

export type CourseListView = "list" | "table";

export const DEFAULT_COURSE_LIST_VIEW: CourseListView = "table";

export function parseCourseListView(value: unknown): CourseListView {
  return value === "list" || value === "table" ? value : DEFAULT_COURSE_LIST_VIEW;
}
