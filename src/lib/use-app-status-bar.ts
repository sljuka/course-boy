import { createContext, useContext } from "react";

// The app frame's status bar sits outside every route layout, so a layout that
// wants to show something there (the course editor's save status) can't render
// into it directly. The status bar publishes its end-slot element through this
// context; `AppStatusBarEnd` portals children into it. See docs/contracts.md §9.

type AppStatusBarContextValue = {
  endElement: HTMLElement | null;
  setEndElement: (element: HTMLElement | null) => void;
};

export const AppStatusBarContext = createContext<AppStatusBarContextValue | null>(null);

export function useAppStatusBar(): AppStatusBarContextValue {
  const context = useContext(AppStatusBarContext);

  if (!context) {
    throw new Error("useAppStatusBar must be used within an AppStatusBarProvider.");
  }

  return context;
}
