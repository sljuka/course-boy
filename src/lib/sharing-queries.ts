import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  CourseSharingInfo,
  ImportCourseInput,
  ImportCourseResult,
} from "@/lib/sharing";
import { queryClient } from "@/lib/query-client";

export function useHasAcknowledgedCreatorKeyQuery() {
  return useQuery<boolean>({
    queryKey: ["preferences", "has-acknowledged-creator-key"],
    queryFn: async () => {
      const preferences = await window.preferences.get();
      return preferences.hasAcknowledgedCreatorKey ?? false;
    },
  });
}

export function useAcknowledgeCreatorKeyMutation() {
  return useMutation({
    mutationFn: () => window.preferences.set({ hasAcknowledgedCreatorKey: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["preferences", "has-acknowledged-creator-key"],
      });
    },
  });
}

// A course's code and whether it's online. Sharing runs in the background after
// Publish (see electron/course-sharing.ts), so poll while it's still going.
export function useCourseSharingQuery(courseId: string | undefined) {
  return useQuery<CourseSharingInfo>({
    enabled: Boolean(courseId),
    queryKey: ["sharing", "course", courseId],
    queryFn: () => window.sharing.getCourseSharing(courseId!),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "sharing" ? 1_000 : status === "waiting" ? 5_000 : false;
    },
  });
}

export function useImportCourseMutation() {
  return useMutation<ImportCourseResult, Error, ImportCourseInput>({
    mutationFn: (input) => window.sharing.importCourse(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "list"],
      });
    },
  });
}
