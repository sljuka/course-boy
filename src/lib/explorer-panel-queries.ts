import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_EXPLORER_PANEL,
  parseExplorerPanelPreference,
  type ExplorerPanelPreference,
} from "@/lib/explorer-panel";

// The course editor's side panels, each remembered across restarts under its
// own preferences key: the explorer (left) and Versions (right).
type SidePanelKey = "explorerPanel" | "versionsPanel";

// A side panel's state (open or closed). Updates are applied to the cache
// immediately and persisted in the background.
export function useSidePanelPreference(
  key: SidePanelKey,
): [ExplorerPanelPreference, (next: Partial<ExplorerPanelPreference>) => void] {
  const queryClient = useQueryClient();
  const queryKey = ["preferences", key] as const;
  const { data } = useQuery({
    queryKey,
    queryFn: async () => parseExplorerPanelPreference((await window.preferences.get())[key]),
  });
  const preference = data ?? DEFAULT_EXPLORER_PANEL;

  const update = useCallback(
    (next: Partial<ExplorerPanelPreference>) => {
      const current =
        queryClient.getQueryData<ExplorerPanelPreference>(["preferences", key]) ??
        DEFAULT_EXPLORER_PANEL;
      const merged = { ...current, ...next };

      queryClient.setQueryData(["preferences", key], merged);
      void window.preferences.set({ [key]: merged });
    },
    [key, queryClient],
  );

  return [preference, update];
}
