import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { ActivitySettings, ActivitySummary, CourseActivity } from "@/lib/course-activity";

// Course activity (SLJ-168). The teacher's counts change when events arrive
// from students' devices; the worker says so and they're read again
// (useRefreshOnActivityChanges, mounted once in App).
const courseKey = (courseId: string) => ["activity", "course", courseId];
const listKey = ["activity", "list"];
const settingsKey = ["activity", "settings"];

export function useCourseActivityQuery(courseId: string | undefined) {
  return useQuery<CourseActivity>({
    enabled: Boolean(courseId),
    queryKey: courseKey(courseId ?? ""),
    queryFn: () => window.activity.get(courseId!),
  });
}

// The teacher's courses with what's counted, for the Activity page.
export function useActivityListQuery() {
  return useQuery<Record<string, ActivitySummary>>({ queryKey: listKey, queryFn: () => window.activity.list() });
}

export function useActivitySettingsQuery() {
  return useQuery<ActivitySettings>({ queryKey: settingsKey, queryFn: () => window.activity.getSettings() });
}

export function useSetActivitySettingsMutation() {
  const client = useQueryClient();
  return useMutation<ActivitySettings, Error, ActivitySettings>({
    mutationFn: (changes) => window.activity.setSettings(changes),
    onSuccess: () => client.invalidateQueries({ queryKey: ["activity"] }),
  });
}

// "Collect activity" lives in the course's board moderation list.
export function useSetCollectActivityMutation(courseId: string) {
  const client = useQueryClient();
  return useMutation<void, Error, boolean>({
    mutationFn: (collect) => window.boards.moderate(courseId, { activity: collect }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: courseKey(courseId) }),
        client.invalidateQueries({ queryKey: ["boards"] }),
      ]),
  });
}

// New activity counted on the teacher's device: read it again.
export function useRefreshOnActivityChanges() {
  const client = useQueryClient();
  useEffect(
    () =>
      window.activity.onChanged((courseId) => {
        void client.invalidateQueries({ queryKey: courseKey(courseId) });
        void client.invalidateQueries({ queryKey: listKey });
      }),
    [client],
  );
}
