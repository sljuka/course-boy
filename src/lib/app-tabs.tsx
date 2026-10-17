import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavigationType, useLocation, useNavigate, useNavigationType } from "react-router-dom";

import {
  activateTab,
  activeTab,
  canMove,
  closeTab,
  createTabsState,
  currentPath,
  moveInHistory,
  moveTab,
  neighbourTabId,
  openTab,
  parseTabsPreference,
  pushEntry,
  replaceEntry,
  type TabsState,
} from "@/lib/tabs";
import { AppTabsContext, type AppTabsContextValue } from "@/lib/use-app-tabs";

const SAVE_DELAY_MS = 300;

// Whether the window opened without a route: main loads the app that way at
// start and when switching profiles. A reload keeps the route it was on.
// Read when this module loads, before the router touches the address.
const openedWithoutRoute = window.location.hash === "" || window.location.hash === "#";

// The window's tabs (SLJ-12), with one router for all of them: the router's
// location is always the active tab's current entry. Every navigation the app
// makes (a link, `navigate`, a redirect, `location.hash`) is recorded in the
// active tab's history; switching tabs and Back/Forward instead replace the
// location with the entry they move to (`pendingPath` tells the two apart).
// So only the active tab's page is mounted, and a page left by switching tabs
// unmounts like any other (a draft editor saves on unmount).
//
// `persist`: the tabs are read from and saved to the open profile's
// preferences, and the last active entry opens when the window opens (not on
// a reload). Off in the launcher and during onboarding.
export function AppTabsProvider({ children, persist }: { children: ReactNode; persist: boolean }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const path = location.pathname + location.search;
  const [state, setState] = useState<TabsState | null>(null);
  const pendingPath = useRef<string | null>(null);

  // Shows `next`'s active entry without recording it as a navigation.
  const show = useCallback(
    (next: TabsState) => {
      setState(next);
      const target = currentPath(activeTab(next));
      if (target !== path) {
        pendingPath.current = target;
        navigate(target, { replace: true });
      }
    },
    [navigate, path],
  );

  // Once: the saved tabs, or one tab on where the window opened.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (!persist) {
      setState(createTabsState(path));
      return;
    }
    void window.preferences.get().then((preferences) => {
      const saved = parseTabsPreference(preferences.tabs);
      if (!saved) setState(createTabsState(path));
      // A fresh window opens the active tab's page; a reload stays where it was.
      else if (openedWithoutRoute) show(saved);
      else setState(pushEntry(saved, path));
    });
  }, [path, persist, show]);

  // Every other location change is a navigation in the active tab. Compared
  // by the location object, not its key: a raw hash change (`location.hash =
  // ...`) arrives with the key "default" every time.
  const lastLocation = useRef(location);
  useEffect(() => {
    if (lastLocation.current === location) return;
    lastLocation.current = location;
    if (pendingPath.current !== null) {
      const expected = pendingPath.current;
      pendingPath.current = null;
      if (expected === path) return;
    }
    setState((current) => {
      if (!current) return current;
      return navigationType === NavigationType.Replace ? replaceEntry(current, path) : pushEntry(current, path);
    });
  }, [location, navigationType, path]);

  // Saved shortly after each change.
  useEffect(() => {
    if (!persist || !state) return;
    const timer = window.setTimeout(() => void window.preferences.set({ tabs: state }), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [persist, state]);

  const value = useMemo<AppTabsContextValue | null>(() => {
    if (!state) return null;
    const active = activeTab(state);
    return {
      activate: (id) => show(activateTab(state, id)),
      activateNeighbour: (offset) => show(activateTab(state, neighbourTabId(state, offset))),
      back: () => show(moveInHistory(state, -1)),
      canGoBack: canMove(active, -1),
      canGoForward: canMove(active, 1),
      close: (id) => show(closeTab(state, id)),
      forward: () => show(moveInHistory(state, 1)),
      move: (id, toIndex) => show(moveTab(state, id, toIndex)),
      open: (target) => show(openTab(state, target)),
      state,
    };
  }, [show, state]);

  useTabShortcuts(value);
  useCloseTabShortcut(value);

  // Nothing renders until the tabs are known, so a restored tab opens straight
  // on its page rather than flashing the one the window started on.
  if (!value) return null;

  return <AppTabsContext.Provider value={value}>{children}</AppTabsContext.Provider>;
}

// ⌘W (Ctrl+W), forwarded by main (it'd otherwise close the window): closes
// the active tab, or the window when it's the only one, like a browser.
function useCloseTabShortcut(tabs: AppTabsContextValue | null): void {
  const latest = useRef(tabs);
  latest.current = tabs;

  useEffect(
    () =>
      window.appWindow.onCloseTabRequest(() => {
        const current = latest.current;
        if (current && current.state.tabs.length > 1) current.close(current.state.activeId);
        else void window.appWindow.close();
      }),
    [],
  );
}

// ⌘T (Ctrl+T) opens a tab on Home, ⌘1–8 jump to that tab and ⌘9 to the last,
// Ctrl+Tab / Ctrl+Shift+Tab and ⌘⇧] / ⌘⇧[ move to the next / previous one.
function useTabShortcuts(tabs: AppTabsContextValue | null): void {
  useEffect(() => {
    if (!tabs) return;
    const isMac = document.documentElement.dataset.platform === "mac";

    function onKeyDown(event: KeyboardEvent) {
      if (!tabs || event.defaultPrevented || event.altKey) return;
      const mod = isMac ? event.metaKey : event.ctrlKey;

      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        tabs.activateNeighbour(event.shiftKey ? -1 : 1);
        return;
      }
      if (!mod) return;
      if (event.shiftKey && (event.code === "BracketRight" || event.code === "BracketLeft")) {
        event.preventDefault();
        tabs.activateNeighbour(event.code === "BracketRight" ? 1 : -1);
        return;
      }
      // ⌘⇧← / ⌘⇧→ (Ctrl+Shift elsewhere) move the active tab (SLJ-148), but
      // not while typing: in a text field they select to the line's start or end.
      if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight") && !isTyping(event.target)) {
        event.preventDefault();
        const at = tabs.state.tabs.findIndex((tab) => tab.id === tabs.state.activeId);
        tabs.move(tabs.state.activeId, at + (event.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (event.shiftKey) return;
      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        tabs.open();
        return;
      }
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= 9) {
        const list = tabs.state.tabs;
        const target = digit === 9 ? list[list.length - 1] : list[digit - 1];
        if (target) {
          event.preventDefault();
          tabs.activate(target.id);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tabs]);
}

// Focus in something that edits text: an input, a textarea or a rich editor.
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox");
}
