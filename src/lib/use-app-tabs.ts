import { createContext, useContext } from "react";

import type { TabsState } from "@/lib/tabs";

// The window's tabs (SLJ-12), from `AppTabsProvider` (src/lib/app-tabs.tsx).
export type AppTabsContextValue = {
  activate: (id: string) => void;
  // A tab `offset` places from the active one, wrapping (Ctrl+Tab).
  activateNeighbour: (offset: number) => void;
  back: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  close: (id: string) => void;
  forward: () => void;
  // A tab moved to `toIndex` in the strip (SLJ-148).
  move: (id: string, toIndex: number) => void;
  // A new tab on `path` (Home when unset), made active.
  open: (path?: string) => void;
  state: TabsState;
};

export const AppTabsContext = createContext<AppTabsContextValue | null>(null);

export function useAppTabs(): AppTabsContextValue {
  const context = useContext(AppTabsContext);

  if (!context) {
    throw new Error("useAppTabs must be used within AppTabsProvider");
  }

  return context;
}

// Null outside the provider (the launcher and onboarding have no tabs).
export function useOptionalAppTabs(): AppTabsContextValue | null {
  return useContext(AppTabsContext);
}
