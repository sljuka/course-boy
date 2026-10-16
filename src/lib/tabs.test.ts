import { describe, expect, it } from "vitest";

import {
  MAX_TAB_ENTRIES,
  MAX_TABS,
  activeTab,
  closeTab,
  createTabsState,
  currentPath,
  moveInHistory,
  neighbourTabId,
  openTab,
  parseTabsPreference,
  pushEntry,
  replaceEntry,
} from "@/lib/tabs";

// SLJ-12: each tab keeps its own history.
describe("tab history", () => {
  it("pushes, goes back and forward, and a push drops the forward entries", () => {
    let state = createTabsState("/", "a");
    state = pushEntry(state, "/settings");
    state = pushEntry(state, "/my-courses");
    state = moveInHistory(state, -1);
    expect(currentPath(activeTab(state))).toBe("/settings");
    state = moveInHistory(state, 1);
    expect(currentPath(activeTab(state))).toBe("/my-courses");
    state = moveInHistory(state, -2);
    state = pushEntry(state, "/publishers");
    expect(activeTab(state).entries).toEqual(["/", "/publishers"]);
  });

  it("ignores the same path again and replaces on a redirect", () => {
    let state = pushEntry(createTabsState("/", "a"), "/");
    expect(activeTab(state).entries).toEqual(["/"]);
    state = replaceEntry(pushEntry(state, "/my-courses"), "/settings");
    expect(activeTab(state).entries).toEqual(["/", "/settings"]);
  });

  it("never records onboarding", () => {
    let state = createTabsState("/onboarding/role", "a");
    expect(activeTab(state).entries).toEqual(["/"]);
    state = replaceEntry(pushEntry(state, "/onboarding"), "/onboarding/persona");
    expect(activeTab(state).entries).toEqual(["/"]);
  });

  it("keeps the newest entries", () => {
    let state = createTabsState("/", "a");
    for (let i = 0; i < MAX_TAB_ENTRIES + 5; i++) state = pushEntry(state, `/courses/${i}`);
    expect(activeTab(state).entries).toHaveLength(MAX_TAB_ENTRIES);
    expect(currentPath(activeTab(state))).toBe(`/courses/${MAX_TAB_ENTRIES + 4}`);
  });
});

describe("opening and closing tabs", () => {
  it("opens a tab after the active one, each with its own history", () => {
    let state = pushEntry(createTabsState("/", "a"), "/settings");
    state = openTab(state, "/my-courses", "b");
    expect(state.tabs.map((tab) => tab.id)).toEqual(["a", "b"]);
    expect(currentPath(activeTab(state))).toBe("/my-courses");
    state = { ...state, activeId: "a" };
    expect(currentPath(activeTab(state))).toBe("/settings");
  });

  it("closing the active tab activates its right neighbour, or the left one at the end", () => {
    let state = openTab(openTab(createTabsState("/", "a"), "/1", "b"), "/2", "c");
    state = closeTab({ ...state, activeId: "b" }, "b");
    expect(state.activeId).toBe("c");
    state = closeTab(state, "c");
    expect(state.activeId).toBe("a");
  });

  it("closing the last tab leaves a fresh Home tab", () => {
    const state = closeTab(pushEntry(createTabsState("/", "a"), "/settings"), "a", "z");
    expect(state).toEqual(createTabsState("/", "z"));
  });

  it("navigates in place instead of opening more than MAX_TABS", () => {
    let state = createTabsState("/", "t0");
    for (let i = 1; i < MAX_TABS; i++) state = openTab(state, "/", `t${i}`);
    state = openTab(state, "/settings", "extra");
    expect(state.tabs).toHaveLength(MAX_TABS);
    expect(currentPath(activeTab(state))).toBe("/settings");
  });

  it("finds neighbours, wrapping around", () => {
    const state = openTab(openTab(createTabsState("/", "a"), "/", "b"), "/", "c");
    expect(neighbourTabId(state, 1)).toBe("a");
    expect(neighbourTabId(state, -1)).toBe("b");
  });
});

describe("parseTabsPreference", () => {
  it("keeps valid tabs and fixes what it can", () => {
    expect(
      parseTabsPreference({
        activeId: "missing",
        tabs: [
          { entries: ["/", "/settings"], id: "a", index: 9 },
          { entries: ["no-slash"], id: "b", index: 0 },
          { entries: ["/x"], id: "a", index: 0 },
          "junk",
        ],
      }),
    ).toEqual({ activeId: "a", tabs: [{ entries: ["/", "/settings"], id: "a", index: 1 }] });
  });

  it("is null for nothing usable", () => {
    expect(parseTabsPreference(null)).toBeNull();
    expect(parseTabsPreference({ activeId: "a", tabs: [] })).toBeNull();
  });
});
