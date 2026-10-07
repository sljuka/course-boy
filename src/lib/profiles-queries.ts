import { useMutation, useQuery } from "@tanstack/react-query";

import type { ProfileRemovalSummary, ProfilesState, RemoveProfileResult } from "@/lib/profiles";

// Which profile this window runs in, and every profile on this computer
// (SLJ-57). Fixed for the life of the window: switching restarts the app.
export function useProfilesStateQuery() {
  return useQuery<ProfilesState>({
    queryKey: ["profiles"],
    queryFn: () => window.profiles.getState(),
    staleTime: Infinity,
  });
}

// What removing the open profile would delete (SLJ-61), read fresh when the
// dialog opens.
export function useProfileRemovalSummaryQuery(enabled: boolean) {
  return useQuery<ProfileRemovalSummary>({
    enabled,
    queryKey: ["profiles", "removal-summary"],
    queryFn: () => window.profiles.getRemovalSummary(),
    staleTime: 0,
  });
}

// Removing it reloads the window at the launcher, so on success nothing here
// needs refreshing.
export function useRemoveProfileMutation() {
  return useMutation<RemoveProfileResult, Error, { password?: string }>({
    mutationFn: ({ password }) => window.profiles.removeCurrent(password),
  });
}
