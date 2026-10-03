import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const queryKey = ["preferences", "previous-versions-to-keep"];

// Must match DEFAULT_PREVIOUS_VERSIONS_TO_KEEP in electron/course-paths.ts.
export const DEFAULT_PREVIOUS_VERSIONS_TO_KEEP = 2;

// How many versions of an imported course, before the current one, are kept
// on this device for going back (SLJ-40). Applied at the next update.
export function usePreviousVersionsToKeep(): [number, (count: number) => void] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: async () =>
      (await window.preferences.get()).previousVersionsToKeep ?? DEFAULT_PREVIOUS_VERSIONS_TO_KEEP,
  });

  const setCount = useCallback(
    (count: number) => {
      queryClient.setQueryData(queryKey, count);
      void window.preferences.set({ previousVersionsToKeep: count });
    },
    [queryClient],
  );

  return [data ?? DEFAULT_PREVIOUS_VERSIONS_TO_KEEP, setCount];
}
