import { useMutation, useQuery } from "@tanstack/react-query";

import type { CourseProgressState, RecordTestResultInput } from "@/lib/course-progress";
import { queryClient } from "@/lib/query-client";

// The student's progress (SLJ-50), read once and refreshed after every
// change; see src/lib/course-progress.ts.
export const courseProgressKey = ["progress"] as const;

export function useCourseProgressQuery() {
  return useQuery<CourseProgressState>({
    queryKey: courseProgressKey,
    queryFn: () => window.progress.get(),
  });
}

const refresh = () => queryClient.invalidateQueries({ queryKey: courseProgressKey });

// Recording progress must never get in a student's way: a failed write is
// logged, not shown.
function logFailure(error: Error) {
  console.error("Couldn't save progress", error);
}

export function recordCourseOpened(courseId: string) {
  void window.progress.recordOpened(courseId).then(refresh, logFailure);
}

export function recordStepDone(courseId: string, stepId: string) {
  void window.progress.recordStepDone({ courseId, stepId }).then(refresh, logFailure);
}

export function recordTestResult(input: RecordTestResultInput) {
  void window.progress.recordTestResult(input).then(refresh, logFailure);
}

// Defined once, not per render: a mutation's options changing on every
// render makes TanStack notify the whole mutation cache each time.
const setFavorite = (input: { courseId: string; favorite: boolean }) => window.progress.setFavorite(input);

export function useSetFavoriteMutation() {
  return useMutation<void, Error, { courseId: string; favorite: boolean }>({
    mutationFn: setFavorite,
    onSuccess: refresh,
  });
}
