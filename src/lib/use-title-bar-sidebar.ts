import { createContext, useContext } from "react";

// Lets the app-wide title bar toggle whichever sidebar the current layout
// renders. Each layout has its own `SidebarProvider` (the app sidebar, the
// course explorer), and the title bar sits above all of them, so it can't call
// `useSidebar()` itself. Instead a layout mounts `RegisterTitleBarSidebarToggle`
// inside its provider, which hands its `toggleSidebar` up through this context.
// `toggle` is null on routes without a sidebar (onboarding, players).

type TitleBarSidebarContextValue = {
  register: (toggle: () => void) => () => void;
  toggle: (() => void) | null;
};

export const TitleBarSidebarContext = createContext<TitleBarSidebarContextValue | null>(null);

export function useTitleBarSidebar(): TitleBarSidebarContextValue {
  const context = useContext(TitleBarSidebarContext);

  if (!context) {
    throw new Error("useTitleBarSidebar must be used within a TitleBarSidebarProvider.");
  }

  return context;
}
