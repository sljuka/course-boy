import { useMutation, useQuery } from "@tanstack/react-query";

import type { IdentityBackupStatus, SaveIdentityBackupResult } from "@/lib/identity-backup";
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
