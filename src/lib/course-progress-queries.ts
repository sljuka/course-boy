import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { type CourseProgressState, type CourseSpree, nextSpree, type RecordTestResultInput } from "@/lib/course-progress";
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

// The course's spree (SLJ-134) and how to grow or end it. Shown straight
// away (the cache is updated before the write), then refreshed from what was
// saved. A teacher's preview keeps its spree for that sitting only.
export function useCourseSpree({ courseId, isPreview }: { courseId: string; isPreview: boolean }) {
  const progressQuery = useCourseProgressQuery();
  const [previewSpree, setPreviewSpree] = useState<CourseSpree | undefined>(undefined);
  const spree = isPreview ? previewSpree : progressQuery.data?.courses[courseId]?.spree;

  function recordFirstTry(isCorrect: boolean) {
    if (isPreview) {
      setPreviewSpree((current) => nextSpree(current, isCorrect));
      return;
    }
    queryClient.setQueryData<CourseProgressState>(courseProgressKey, (state) => {
      if (!state) return state;
      const course = state.courses[courseId] ?? { steps: {} };
      return {
        ...state,
        courses: { ...state.courses, [courseId]: { ...course, spree: nextSpree(course.spree, isCorrect) } },
      };
    });
    void window.progress.recordFirstTry({ courseId, isCorrect }).then(refresh, logFailure);
  }

  return { best: spree?.best ?? 0, current: spree?.current ?? 0, recordFirstTry };
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

const setProgramFavorite = (input: { favorite: boolean; programId: string }) => window.progress.setProgramFavorite(input);

// A program's star (SLJ-32), kept with the courses' in the progress store.
export function useSetProgramFavoriteMutation() {
  return useMutation<void, Error, { favorite: boolean; programId: string }>({
    mutationFn: setProgramFavorite,
    onSuccess: refresh,
  });
}

// Start a course over (the course page's ⋯ menu): its progress is cleared,
// its star kept. Unlike recording, the student asked for this, so a failure
// shows.
export function useClearCourseProgressMutation() {
  return useMutation({
    mutationFn: (courseId: string) => window.progress.clearCourse(courseId),
    onSuccess: refresh,
  });
}
