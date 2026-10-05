import { useMutation, useMutationState, useQuery, type Mutation } from "@tanstack/react-query";

import type {
  ApplyCourseUpdateResult,
  CourseSharingInfo,
  TransferInfo,
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
// `watchPeers`: poll every few seconds once online, for a live "Peers online"
// count (the Share dialog, the Details panel).
export function useCourseSharingQuery(courseId: string | undefined, { watchPeers = false } = {}) {
  return useQuery<CourseSharingInfo>({
    enabled: Boolean(courseId),
    queryKey: ["sharing", "course", courseId],
    queryFn: () => window.sharing.getCourseSharing(courseId!),
    // Fast while going online; otherwise every 30 s, so an update to an imported
    // course shows up while its page is open.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "sharing" ? 1_000 : status === "waiting" || watchPeers ? 5_000 : 30_000;
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
  return useMutation<ApplyCourseUpdateResult, Error, { courseId: string; transferId: string }>({
    mutationFn: ({ courseId, transferId }) => window.sharing.applyCourseUpdate(courseId, transferId),
    onSuccess: (_result, { courseId }) => invalidateAfterUpdateChange(courseId),
  });
}

// An import or update download in progress (SLJ-43), polled while it runs.
export function useTransferQuery(transferId: string | null) {
  return useQuery<TransferInfo | null>({
    enabled: transferId !== null,
    queryKey: ["sharing", "transfer", transferId],
    queryFn: () => window.sharing.getTransfer(transferId!),
    refetchInterval: 500,
  });
}

// Switches an imported course to another version kept on this device.
export function useSwitchCourseVersionMutation() {
  return useMutation<void, Error, { courseId: string; version: string }>({
    mutationFn: ({ courseId, version }) => window.sharing.switchCourseVersion(courseId, version),
    onSuccess: (_result, { courseId }) => invalidateAfterUpdateChange(courseId),
  });
}

export function useFinishOnVersionMutation() {
  return useMutation<void, Error, string>({
    mutationFn: (courseId) => window.sharing.finishOnVersion(courseId),
    onSuccess: (_result, courseId) => invalidateAfterUpdateChange(courseId),
  });
}

const importMutationKey = ["sharing", "import"] as const;

export function useImportCourseMutation() {
  return useMutation<ImportCourseResult, Error, ImportCourseInput>({
    mutationKey: importMutationKey,
    mutationFn: (input) => window.sharing.importCourse(input),
    // Kept until dismissed: a failed import stays on Home (SLJ-49), even
    // after the dialog that started it is gone.
    gcTime: Infinity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", "list"],
      });
    },
  });
}

// Imports still running, or that failed and haven't been dismissed (SLJ-49),
// for Home's Downloading group. They live in the query client's mutation
// cache, so they keep running (and stay listed) after the Import dialog
// closes or the student leaves Home. A finished import drops out once the
// course list has refetched, so the course moves straight to Imported.
export type PendingImport = {
  code: string;
  dismiss: () => void;
  error: Error | null;
  transferId: string;
};

// Drops an import from Home's list, e.g. one whose error the Import dialog
// already shows.
export function discardImport(transferId: string) {
  const cache = queryClient.getMutationCache();
  for (const mutation of cache.findAll({ mutationKey: importMutationKey })) {
    if ((mutation.state.variables as ImportCourseInput | undefined)?.transferId === transferId) {
      cache.remove(mutation);
    }
  }
}

export function usePendingImports(): PendingImport[] {
  return useMutationState({
    filters: {
      mutationKey: importMutationKey,
      predicate: (mutation) => mutation.state.status === "pending" || mutation.state.status === "error",
    },
    select: (mutation) => {
      const typed = mutation as unknown as Mutation<ImportCourseResult, Error, ImportCourseInput>;
      const input = typed.state.variables;
      return {
        code: input?.code ?? "",
        dismiss: () => queryClient.getMutationCache().remove(mutation),
        error: typed.state.error,
        transferId: input?.transferId ?? String(mutation.mutationId),
      };
    },
  });
}
