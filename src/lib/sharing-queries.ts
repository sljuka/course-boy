import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  ImportCourseInput,
  ImportCourseResult,
  ShareCourseInput,
  ShareCourseResult,
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

export function useShareCourseMutation() {
  return useMutation<ShareCourseResult, Error, ShareCourseInput>({
    mutationFn: (input) => window.sharing.shareCourse(input),
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
