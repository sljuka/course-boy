import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// Keep sharing in the background (SLJ-129): the open profile's answer (unset
// before it was asked) and whether Matko opens at login.
type BackgroundPreferences = { keepSharing: boolean | null; openAtLogin: boolean };

const queryKey = ["preferences", "background"];

export function useBackgroundPreferences(): [
  BackgroundPreferences,
  (change: { keepSharingInBackground?: boolean; openAtLogin?: boolean }) => Promise<void>,
] {
  const client = useQueryClient();
  const { data } = useQuery<BackgroundPreferences>({
    queryKey,
    queryFn: async () => {
      const preferences = await window.preferences.get();
      return { keepSharing: preferences.keepSharingInBackground ?? null, openAtLogin: preferences.openAtLogin ?? false };
    },
  });
  const save = useCallback(
    async (change: { keepSharingInBackground?: boolean; openAtLogin?: boolean }) => {
      await window.preferences.set(change);
      await client.invalidateQueries({ queryKey });
    },
    [client],
  );
  return [data ?? { keepSharing: null, openAtLogin: false }, save];
}
