import { createContext, useContext, type ReactNode } from "react";

// A route layout's in-page side panels. Like `LayoutBreadcrumbsContext`, they
// belong to the layout because the course editor is one route whose pages are
// explorer selections: every editor page shows the same panels. `Page` renders
// the left one before its scrolling body and the right one after it, with
// their toggles at the start and end of the page's action bar.
//
// - left: the course editor's explorer.
// - right: the course editor's Versions (cut versions, revert, publish), or
//   the course page's Details (id, version, dates; it provides its own).
//
// See docs/contracts.md §9.
export type PageSidePanelValue = {
  content: ReactNode;
  // Accessible name of the panel.
  label: string;
  // As a drawer (narrow windows), the panel closes whenever this changes, e.g.
  // the explorer's selection: picking something is "done, show me the page".
  dismissKey?: unknown;
  // As a drawer: its open state kept by the layout, so it stays open while the
  // page under it changes (the explorer adding an item opens that item's
  // page). Unset: the page keeps it, closed again on every new page.
  drawer?: { onOpenChange: (open: boolean) => void; open: boolean };
  onOpenChange: (open: boolean) => void;
  // Inline (wide windows) only; a drawer starts closed and never changes it.
  open: boolean;
  toggleLabel: string;
};

export type PageSidePanels = {
  left?: PageSidePanelValue;
  right?: PageSidePanelValue;
};

export const PageSidePanelsContext = createContext<PageSidePanels | null>(null);

export function usePageSidePanels(): PageSidePanels {
  return useContext(PageSidePanelsContext) ?? {};
}
