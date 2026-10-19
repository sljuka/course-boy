import { createContext, useContext } from "react";

// Which view of a course is shown (SLJ-149): the course itself or its board.
// The board view exists only while the board is on. Kept in the page's state,
// not the address (the editor rewrites its address on every selection);
// a link passes the view in its navigation state (`{ courseView: "board" }`).
export type CourseView = "board" | "course";

export function courseViewFromState(state: unknown): CourseView {
  return (state as { courseView?: unknown } | null)?.courseView === "board" ? "board" : "course";
}

// The editor's view, for what's inside it (the course form's "Open the board").
export const CourseViewContext = createContext<{ setView: (view: CourseView) => void; view: CourseView } | null>(null);

export function useCourseViewContext() {
  return useContext(CourseViewContext);
}
