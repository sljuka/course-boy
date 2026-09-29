// The course editor's explorer panel: whether it's open. It always sits on the
// left of the page (the right side is reserved for a later panel). Per-device
// UI state, persisted in the preferences store. Kept free of React so the main
// process can validate what the renderer sends.

export type ExplorerPanelPreference = {
  open: boolean;
};

export const DEFAULT_EXPLORER_PANEL: ExplorerPanelPreference = { open: true };

export function parseExplorerPanelPreference(value: unknown): ExplorerPanelPreference {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_EXPLORER_PANEL;
  }

  const candidate = value as Record<string, unknown>;

  return {
    open: typeof candidate.open === "boolean" ? candidate.open : DEFAULT_EXPLORER_PANEL.open,
  };
}
