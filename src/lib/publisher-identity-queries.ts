import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  ChooseIdentityFileResult,
  IdentityRestoreStatus,
  IdentityStatus,
  RestoreIdentityResult,
  SetUpIdentityResult,
  UnlockIdentityResult,
} from "@/lib/publisher-identity";
import { queryClient } from "@/lib/query-client";

export const identityStatusKey = ["sharing", "identity-status"] as const;

// Whether the publisher identity is set up and unlocked this session (SLJ-55).
// Read fresh wherever it's shown: setting it up or unlocking it can happen
// from another screen.
export function useIdentityStatusQuery() {
  return useQuery<IdentityStatus>({
    queryKey: identityStatusKey,
    queryFn: () => window.sharing.getIdentityStatus(),
    staleTime: 0,
  });
}

// Read fresh before a Publish: is there an identity, is it unlocked?
export function fetchIdentityStatus() {
  return queryClient.fetchQuery<IdentityStatus>({
    queryKey: identityStatusKey,
    queryFn: () => window.sharing.getIdentityStatus(),
    staleTime: 0,
  });
}

async function invalidateIdentity() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: identityStatusKey }),
    // The publisher id and every course's sharing status follow the identity.
    queryClient.invalidateQueries({ queryKey: ["sharing"] }),
  ]);
}

export function useSetUpIdentityMutation() {
  return useMutation<SetUpIdentityResult, Error, { password: string }>({
    mutationFn: ({ password }) => window.sharing.setUpIdentity(password),
    onSuccess: invalidateIdentity,
  });
}

export function useUnlockIdentityMutation() {
  return useMutation<UnlockIdentityResult, Error, { password: string }>({
    mutationFn: ({ password }) => window.sharing.unlockIdentity(password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityStatusKey }),
  });
}

export function useOpenWithoutPublishingMutation() {
  return useMutation<void, Error, void>({
    mutationFn: () => window.sharing.openWithoutPublishing(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityStatusKey }),
  });
}

// ─── Restoring (SLJ-54) ─────────────────────────────────────────────────────

export const identityRestoreStatusKey = ["sharing", "identity-restore"] as const;

// The courses a restored identity found again, polled while the search runs.
export function useIdentityRestoreStatusQuery() {
  return useQuery<IdentityRestoreStatus>({
    queryKey: identityRestoreStatusKey,
    queryFn: () => window.sharing.getIdentityRestoreStatus(),
    refetchInterval: (query) => (query.state.data?.searching ? 2_000 : false),
    staleTime: 0,
  });
}

export function useChooseIdentityFileMutation() {
  return useMutation<ChooseIdentityFileResult, Error, void>({
    mutationFn: () => window.sharing.chooseIdentityFile(),
  });
}

export function useRestoreIdentityMutation() {
  return useMutation<RestoreIdentityResult, Error, { password: string }>({
    mutationFn: ({ password }) => window.sharing.restoreIdentity(password),
    onSuccess: async (result) => {
      if (!("restored" in result)) return;
      await Promise.all([invalidateIdentity(), queryClient.invalidateQueries({ queryKey: ["courses"] })]);
    },
  });
}

// "Look again", for courses nobody who had them was online the first time.
export function useSearchRestoredCoursesMutation() {
  return useMutation<void, Error, void>({
    mutationFn: () => window.sharing.searchRestoredCourses(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityRestoreStatusKey }),
  });
}
