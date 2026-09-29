import { createContext, useContext, type ReactNode } from "react";

// A route layout's in-page side panels. Like `LayoutBreadcrumbsContext`, they
// belong to the layout because the course editor is one route whose pages are
// explorer selections: every editor page shows the same panels. `Page` renders
// the left one before its scrolling body and the right one after it, with
// their toggles at the start and end of the page's action bar.
//
// - left: the course editor's explorer.
// - right: reserved for a later panel (properties/inspector); nothing uses it yet.
//
// See docs/contracts.md §9.
export type PageSidePanelValue = {
  content: ReactNode;
  // Accessible name of the panel.
  label: string;
  onOpenChange: (open: boolean) => void;
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
