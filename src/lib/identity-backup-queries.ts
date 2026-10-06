import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import type {
  ChooseIdentityBackupResult,
  IdentityBackupStatus,
  IdentityRestoreStatus,
  RestoreIdentityResult,
  SaveIdentityBackupResult,
} from "@/lib/identity-backup";
export { needsIdentityBackup } from "@/lib/identity-backup";
import { queryClient } from "@/lib/query-client";

export const identityBackupStatusKey = ["sharing", "identity-backup"] as const;

// Whether the publisher identity is backed up (SLJ-53): Settings' status line
// and the reminder dot on the app menu. Refetched whenever it's shown, since a
// Publish can add a course the newest backup doesn't cover.
export function useIdentityBackupStatusQuery() {
  return useQuery<IdentityBackupStatus>({
    queryKey: identityBackupStatusKey,
    queryFn: () => window.sharing.getIdentityBackupStatus(),
  });
}

// Read once, fresh, before a Publish: is there a backup yet?
export function fetchIdentityBackupStatus() {
  return queryClient.fetchQuery<IdentityBackupStatus>({
    queryKey: identityBackupStatusKey,
    queryFn: () => window.sharing.getIdentityBackupStatus(),
  });
}

export function useSaveIdentityBackupMutation() {
  return useMutation<SaveIdentityBackupResult, Error, { includeCourseId?: string; password: string }>({
    mutationFn: ({ includeCourseId, password }) => window.sharing.saveIdentityBackup(password, includeCourseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityBackupStatusKey }),
  });
}

// ─── Restoring (SLJ-54) ─────────────────────────────────────────────────────

export const identityRestoreStatusKey = ["sharing", "identity-restore"] as const;

// The courses a restored identity brings back, polled while any is still on
// its way (waiting for a student to come online, or downloading).
export function useIdentityRestoreStatusQuery() {
  return useQuery<IdentityRestoreStatus>({
    queryKey: identityRestoreStatusKey,
    queryFn: () => window.sharing.getIdentityRestoreStatus(),
    refetchInterval: (query) =>
      query.state.data?.courses.some((course) => course.state === "waiting") ? 2_000 : false,
  });
}

export function useChooseIdentityBackupFileMutation() {
  return useMutation<ChooseIdentityBackupResult, Error, void>({
    mutationFn: () => window.sharing.chooseIdentityBackupFile(),
  });
}

export function useRestoreIdentityMutation() {
  return useMutation<RestoreIdentityResult, Error, { password: string }>({
    mutationFn: ({ password }) => window.sharing.restoreIdentity(password),
    onSuccess: async (result) => {
      if (!("restored" in result)) return;
      // A new identity: its key, consent, backup status and courses.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sharing"] }),
        queryClient.invalidateQueries({ queryKey: ["preferences"] }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
      ]);
    },
  });
}

const restoreAfterOnboardingKey = ["preferences", "restoreIdentityAfterOnboarding"] as const;

// "I already have a publisher identity" on the new-profile screen: the restore
// dialog opens once onboarding is done. Dismissing it (restored or not) clears it.
export function useRestoreIdentityAfterOnboarding(): [boolean, () => void] {
  const { data } = useQuery({
    queryKey: restoreAfterOnboardingKey,
    queryFn: async () => (await window.preferences.get()).restoreIdentityAfterOnboarding === true,
  });

  const dismiss = useCallback(() => {
    queryClient.setQueryData(restoreAfterOnboardingKey, false);
    void window.preferences.set({ restoreIdentityAfterOnboarding: false });
  }, []);

  return [data ?? false, dismiss];
}
