import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_EXPLORER_PANEL,
  parseExplorerPanelPreference,
  type ExplorerPanelPreference,
} from "@/lib/explorer-panel";

const explorerPanelQueryKey = ["preferences", "explorer-panel"] as const;

// The editor's explorer panel state (open, side), remembered across restarts.
// Updates are applied to the cache immediately and persisted in the background.
export function useExplorerPanelPreference(): [
  ExplorerPanelPreference,
  (next: Partial<ExplorerPanelPreference>) => void,
] {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: explorerPanelQueryKey,
    queryFn: async () => parseExplorerPanelPreference((await window.preferences.get()).explorerPanel),
  });
  const preference = data ?? DEFAULT_EXPLORER_PANEL;

  const update = useCallback(
    (next: Partial<ExplorerPanelPreference>) => {
      const current =
        queryClient.getQueryData<ExplorerPanelPreference>(explorerPanelQueryKey) ??
        DEFAULT_EXPLORER_PANEL;
      const merged = { ...current, ...next };

      queryClient.setQueryData(explorerPanelQueryKey, merged);
      void window.preferences.set({ explorerPanel: merged });
    },
    [queryClient],
  );

  return [preference, update];
}
