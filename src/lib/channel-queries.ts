import { useMutation, useQuery } from "@tanstack/react-query";

import type { ChannelForCourse } from "@/lib/channels";
import { queryClient } from "@/lib/query-client";

// Channels (SLJ-31). The profile's own channel is created the first time it's
// asked for (My channel).

export function useOwnChannelQuery() {
  return useQuery<{ programId: string }>({
    queryKey: ["channels", "own"],
    queryFn: () => window.channels.own(),
  });
}

// A course's channel: yours (and whether the course is on it), or the one an
// imported course names (and whether that's checked).
export function useCourseChannelQuery(courseId: string | undefined) {
  return useQuery<ChannelForCourse | null>({
    enabled: Boolean(courseId),
    queryKey: ["channels", "course", courseId],
    queryFn: () => window.channels.getForCourse(courseId!),
  });
}

// Defined once, not per render (see program-queries.ts).
const setCourseListed = (input: { courseId: string; listed: boolean }) => window.channels.setCourseListed(input);

export function useSetCourseListedMutation() {
  return useMutation<void, Error, { courseId: string; listed: boolean }>({
    mutationFn: setCourseListed,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["channels"] }),
        queryClient.invalidateQueries({ queryKey: ["programs"] }),
      ]),
  });
}
