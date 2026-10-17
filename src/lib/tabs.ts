// Tabs in the window title bar (SLJ-12): each tab has its own location and
// its own back/forward history. One router serves them all: switching tabs
// (or going back) navigates to that tab's current entry, so only the active
// tab's page is mounted. The tabs persist across restarts in the preferences
// store, per profile. Kept free of React/router imports because the main
// process uses `parseTabsPreference` to validate what the renderer sends
// before persisting it.

export type AppTab = {
  // In-app routes (path plus query), oldest first.
  entries: string[];
  id: string;
  // The entry the tab shows now; back/forward move it.
  index: number;
};

export type TabsState = {
  activeId: string;
  tabs: AppTab[];
};

export const MAX_TABS = 20;
export const MAX_TAB_ENTRIES = 50;
const MAX_PATH_LENGTH = 512;
const MAX_ID_LENGTH = 64;
export const HOME_PATH = "/";

// Pages that never go into a tab's history: onboarding, which ends where the
// tabs begin (Back from Home must not lead into it).
export function isTabPath(path: string): boolean {
  return !path.startsWith("/onboarding");
}

export function createTabId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createTabsState(path: string = HOME_PATH, id: string = createTabId()): TabsState {
  return { activeId: id, tabs: [{ entries: [isTabPath(path) ? path : HOME_PATH], id, index: 0 }] };
}

export function activeTab(state: TabsState): AppTab {
  return state.tabs.find((tab) => tab.id === state.activeId) ?? state.tabs[0];
}

export function currentPath(tab: AppTab): string {
  return tab.entries[tab.index] ?? HOME_PATH;
}

function updateActive(state: TabsState, update: (tab: AppTab) => AppTab): TabsState {
  const active = activeTab(state);
  return { ...state, tabs: state.tabs.map((tab) => (tab.id === active.id ? update(tab) : tab)) };
}

// A navigation in the active tab: drops the forward entries, like a browser,
// and keeps at most MAX_TAB_ENTRIES (the oldest go first). The same path again
// adds nothing.
export function pushEntry(state: TabsState, path: string): TabsState {
  if (!isTabPath(path)) return state;
  return updateActive(state, (tab) => {
    if (currentPath(tab) === path) return tab;
    const entries = [...tab.entries.slice(0, tab.index + 1), path].slice(-MAX_TAB_ENTRIES);
    return { ...tab, entries, index: entries.length - 1 };
  });
}

// A redirect: the current entry becomes `path`.
export function replaceEntry(state: TabsState, path: string): TabsState {
  if (!isTabPath(path)) return state;
  return updateActive(state, (tab) => ({
    ...tab,
    entries: tab.entries.map((entry, index) => (index === tab.index ? path : entry)),
  }));
}

export function canMove(tab: AppTab, delta: number): boolean {
  const index = tab.index + delta;
  return index >= 0 && index < tab.entries.length;
}

// Back (-1) or forward (+1) in the active tab; unchanged at either end.
export function moveInHistory(state: TabsState, delta: number): TabsState {
  return updateActive(state, (tab) => (canMove(tab, delta) ? { ...tab, index: tab.index + delta } : tab));
}

// A new tab on `path`, after the active one, made active. At MAX_TABS the
// active tab navigates instead.
export function openTab(state: TabsState, path: string = HOME_PATH, id: string = createTabId()): TabsState {
  if (state.tabs.length >= MAX_TABS) return pushEntry(state, path);
  const at = state.tabs.findIndex((tab) => tab.id === activeTab(state).id) + 1;
  const tab: AppTab = { entries: [path], id, index: 0 };
  return { activeId: id, tabs: [...state.tabs.slice(0, at), tab, ...state.tabs.slice(at)] };
}

export function activateTab(state: TabsState, id: string): TabsState {
  return state.tabs.some((tab) => tab.id === id) ? { ...state, activeId: id } : state;
}

// Closing the active tab activates its right neighbour (or the left one at the
// end). The last tab is never closed: it goes back to a fresh Home instead.
export function closeTab(state: TabsState, id: string, newId: string = createTabId()): TabsState {
  const at = state.tabs.findIndex((tab) => tab.id === id);
  if (at === -1) return state;
  if (state.tabs.length === 1) return createTabsState(HOME_PATH, newId);
  const tabs = state.tabs.filter((tab) => tab.id !== id);
  const activeId = state.activeId === id ? tabs[Math.min(at, tabs.length - 1)].id : state.activeId;
  return { activeId, tabs };
}

// A tab moved to `toIndex` in the strip (SLJ-148: dragging, ⌘⇧←/→), kept
// within it. Its history and which tab is active don't change.
export function moveTab(state: TabsState, id: string, toIndex: number): TabsState {
  const from = state.tabs.findIndex((tab) => tab.id === id);
  if (from === -1) return state;
  const to = Math.min(Math.max(Math.round(toIndex), 0), state.tabs.length - 1);
  if (to === from) return state;
  const tabs = state.tabs.filter((tab) => tab.id !== id);
  tabs.splice(to, 0, state.tabs[from]);
  return { ...state, tabs };
}

// The tab `offset` places from the active one, wrapping around (Ctrl+Tab).
export function neighbourTabId(state: TabsState, offset: number): string {
  const at = state.tabs.findIndex((tab) => tab.id === activeTab(state).id);
  const count = state.tabs.length;
  return state.tabs[(((at + offset) % count) + count) % count].id;
}

function isPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && value.length <= MAX_PATH_LENGTH && isTabPath(value);
}

function parseTab(value: unknown): AppTab | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0 || candidate.id.length > MAX_ID_LENGTH) return null;
  if (!Array.isArray(candidate.entries)) return null;
  const entries = candidate.entries.filter(isPath).slice(-MAX_TAB_ENTRIES);
  if (entries.length === 0) return null;
  const index = typeof candidate.index === "number" && Number.isInteger(candidate.index) ? candidate.index : entries.length - 1;
  return { entries, id: candidate.id, index: Math.min(Math.max(index, 0), entries.length - 1) };
}

// Drops malformed tabs and caps the counts; null when nothing usable is left.
// The preferences store only ever persists what passes here.
export function parseTabsPreference(value: unknown): TabsState | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.tabs)) return null;
  const seen = new Set<string>();
  const tabs: AppTab[] = [];
  for (const raw of candidate.tabs) {
    const tab = parseTab(raw);
    if (tab && !seen.has(tab.id)) {
      seen.add(tab.id);
      tabs.push(tab);
    }
    if (tabs.length === MAX_TABS) break;
  }
  if (tabs.length === 0) return null;
  const activeId = typeof candidate.activeId === "string" && seen.has(candidate.activeId) ? candidate.activeId : tabs[0].id;
  return { activeId, tabs };
}
