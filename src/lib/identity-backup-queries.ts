import { useMutation, useQuery } from "@tanstack/react-query";

import type { IdentityBackupStatus, SaveIdentityBackupResult } from "@/lib/identity-backup";
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

export function useSaveIdentityBackupMutation() {
  return useMutation<SaveIdentityBackupResult, Error, string>({
    mutationFn: (password) => window.sharing.saveIdentityBackup(password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityBackupStatusKey }),
  });
}

// "Not backed up" deserves a reminder: there's an identity, and either no
// backup at all or published courses the newest one doesn't cover.
export function needsIdentityBackup(status: IdentityBackupStatus | undefined): boolean {
  return Boolean(status?.available && (status.lastBackupAt === null || status.coursesNotBackedUp > 0));
}
