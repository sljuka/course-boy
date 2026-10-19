import { createContext, useContext, type ReactNode } from "react";

// A route layout's default for the start of the page's action bar, like
// LayoutBreadcrumbsContext for the trail: the course editor's view tabs
// (Course | Board, SLJ-149) belong to the layout, which every editor page
// (course, section, lesson, test) shows without threading a prop through
// each editor component. An explicit `actionBarStart` on `<Page>` still wins.
export const LayoutActionBarStartContext = createContext<ReactNode>(null);

export function useLayoutActionBarStart(): ReactNode {
  return useContext(LayoutActionBarStartContext);
}
