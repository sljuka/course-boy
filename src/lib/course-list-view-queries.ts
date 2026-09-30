import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_COURSE_LIST_VIEW,
  parseCourseListView,
  type CourseListView,
} from "@/lib/course-list-view";

const queryKey = ["preferences", "myCoursesView"] as const;

// My courses' chosen view, remembered across restarts. Applied to the cache
// immediately and persisted in the background.
export function useMyCoursesView(): [CourseListView, (view: CourseListView) => void] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: async () => parseCourseListView((await window.preferences.get()).myCoursesView),
  });

  const setView = useCallback(
    (view: CourseListView) => {
      queryClient.setQueryData(queryKey, view);
      void window.preferences.set({ myCoursesView: view });
    },
    [queryClient],
  );

  return [data ?? DEFAULT_COURSE_LIST_VIEW, setView];
}
