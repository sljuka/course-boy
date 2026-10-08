import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const queryKey = ["preferences", "useProgramThemes"] as const;

// Whether programs recolor the app with their own theme (SLJ-32), on their
// page and in their courses. On by default; Settings → Interface turns it off
// for anyone who'd rather keep their own colors.
export function useProgramThemesPreference(): [boolean, (use: boolean) => void] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey,
    queryFn: async () => (await window.preferences.get()).useProgramThemes !== false,
  });

  const setUse = useCallback(
    (use: boolean) => {
      queryClient.setQueryData(queryKey, use);
      void window.preferences.set({ useProgramThemes: use });
    },
    [queryClient],
  );

  return [data ?? true, setUse];
}
