import { useQuery } from "@tanstack/react-query";

import type { ProfilesState } from "@/lib/profiles";

// Which profile this window runs in, and every profile on this computer
// (SLJ-57). Fixed for the life of the window: switching restarts the app.
export function useProfilesStateQuery() {
  return useQuery<ProfilesState>({
    queryKey: ["profiles"],
    queryFn: () => window.profiles.getState(),
    staleTime: Infinity,
  });
}
