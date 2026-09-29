import { describe, expect, it } from "vitest";

import { DEFAULT_EXPLORER_PANEL, parseExplorerPanelPreference } from "./explorer-panel";

describe("parseExplorerPanelPreference", () => {
  it("keeps a valid open state", () => {
    expect(parseExplorerPanelPreference({ open: false })).toEqual({ open: false });
  });

  it("drops unknown fields and falls back for anything malformed", () => {
    expect(parseExplorerPanelPreference({ open: false, side: "right" })).toEqual({ open: false });
    expect(parseExplorerPanelPreference({ open: "yes" })).toEqual(DEFAULT_EXPLORER_PANEL);
    expect(parseExplorerPanelPreference(null)).toEqual(DEFAULT_EXPLORER_PANEL);
  });
});
