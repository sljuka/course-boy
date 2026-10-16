import type { MouseEvent } from "react";

import { useOptionalAppTabs } from "@/lib/use-app-tabs";

// Opening a link in a new tab (SLJ-12): a middle-click, or a click with ⌘
// (Ctrl on Windows and Linux), on anything that navigates. Spread onto the
// link; a plain click still navigates the current tab. The app handles these
// itself: left to Electron, a middle-click would ask for a new window, which
// the window lock refuses (SLJ-48). Outside the tabs (launcher, onboarding)
// they do nothing special.
export function useNewTabLink(href: string) {
  const tabs = useOptionalAppTabs();
  const isMac = typeof document !== "undefined" && document.documentElement.dataset.platform === "mac";

  return {
    onAuxClick(event: MouseEvent) {
      if (!tabs || event.button !== 1) return;
      event.preventDefault();
      tabs.open(href);
    },
    onClick(event: MouseEvent) {
      if (!tabs || !(isMac ? event.metaKey : event.ctrlKey)) return;
      event.preventDefault();
      tabs.open(href);
    },
    // A middle-click would otherwise start auto-scrolling.
    onMouseDown(event: MouseEvent) {
      if (tabs && event.button === 1) event.preventDefault();
    },
  };
}
