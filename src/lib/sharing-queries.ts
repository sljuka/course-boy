import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  ApplyCourseUpdateResult,
  CourseSharingInfo,
  CourseUpdateInfo,
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
    // Fast while going online; otherwise every 30 s, so an update to an imported
    // course shows up while its page is open.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "sharing" ? 1_000 : status === "waiting" ? 5_000 : 30_000;
    },
  });
}

// Imported courses with an update, for the badge on Home.
export function useCourseUpdatesQuery() {
  return useQuery<Record<string, CourseUpdateInfo>>({
    queryKey: ["sharing", "updates"],
    queryFn: () => window.sharing.listCourseUpdates(),
    refetchInterval: 30_000,
  });
}

async function invalidateAfterUpdateChange(courseId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sharing", "course", courseId] }),
    queryClient.invalidateQueries({ queryKey: ["sharing", "updates"] }),
    queryClient.invalidateQueries({ queryKey: ["courses", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["courses", "detail", courseId] }),
  ]);
}

export function useApplyCourseUpdateMutation() {
  return useMutation<ApplyCourseUpdateResult, Error, string>({
    mutationFn: (courseId) => window.sharing.applyCourseUpdate(courseId),
    onSuccess: (_result, courseId) => invalidateAfterUpdateChange(courseId),
  });
}

export function useFinishOnVersionMutation() {
  return useMutation<void, Error, string>({
    mutationFn: (courseId) => window.sharing.finishOnVersion(courseId),
    onSuccess: (_result, courseId) => invalidateAfterUpdateChange(courseId),
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
