import { createContext, useContext } from "react";

// Which view of a course is shown (SLJ-149): the course itself, its board,
// or (the teacher's editor only) its activity (SLJ-168). The board view
// exists only while the board is on, the activity view once the course is
// published. Kept in the page's state, not the address (the editor rewrites
// its address on every selection); a link passes the view in its navigation
// state (`{ courseView: "board" }`).
export type CourseView = "activity" | "board" | "course";

export function courseViewFromState(state: unknown): CourseView {
  const view = (state as { courseView?: unknown } | null)?.courseView;
  return view === "board" || view === "activity" ? view : "course";
}

// The editor's view, for what's inside it (the course form's "Open the board").
export const CourseViewContext = createContext<{ setView: (view: CourseView) => void; view: CourseView } | null>(null);

export function useCourseViewContext() {
  return useContext(CourseViewContext);
}
