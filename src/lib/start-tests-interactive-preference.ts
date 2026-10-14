import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const queryKey = ["preferences", "startTestsInteractive"] as const;

// Whether a test opens in interactive mode, one question at a time (SLJ-132).
// On by default; Settings → Interface turns it off for anyone who'd rather
// open tests in paper mode. `isLoading` lets the test player wait for it
// instead of opening in one mode and jumping to the other.
export function useStartTestsInteractivePreference(): {
  isLoading: boolean;
  setStartInteractive: (start: boolean) => void;
  startInteractive: boolean;
} {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await window.preferences.get()).startTestsInteractive !== false,
  });

  const setStartInteractive = useCallback(
    (start: boolean) => {
      queryClient.setQueryData(queryKey, start);
      void window.preferences.set({ startTestsInteractive: start });
    },
    [queryClient],
  );

  return { isLoading, setStartInteractive, startInteractive: data ?? true };
}
