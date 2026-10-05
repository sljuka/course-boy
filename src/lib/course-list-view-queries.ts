import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_COURSE_LIST_VIEW,
  DEFAULT_HOME_VIEW,
  parseCourseListView,
  type CourseListView,
} from "@/lib/course-list-view";

type ViewPreference = "homeView" | "myCoursesView";

const defaults: Record<ViewPreference, CourseListView> = {
  homeView: DEFAULT_HOME_VIEW,
  myCoursesView: DEFAULT_COURSE_LIST_VIEW,
};

// A page's chosen view, remembered across restarts. Applied to the cache
// immediately and persisted in the background.
function useCourseListView(preference: ViewPreference): [CourseListView, (view: CourseListView) => void] {
  const queryClient = useQueryClient();
  const queryKey = ["preferences", preference];
  const { data } = useQuery({
    queryKey,
    queryFn: async () => parseCourseListView((await window.preferences.get())[preference], defaults[preference]),
  });

  const setView = useCallback(
    (view: CourseListView) => {
      queryClient.setQueryData(["preferences", preference], view);
      void window.preferences.set({ [preference]: view });
    },
    [preference, queryClient],
  );

  return [data ?? defaults[preference], setView];
}

export function useMyCoursesView() {
  return useCourseListView("myCoursesView");
}

export function useHomeView() {
  return useCourseListView("homeView");
}
