import { Plus } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlignWithPage } from "@/components/app-title-bar/use-align-with-page";
import { useTabDrag } from "@/components/app-title-bar/use-tab-drag";
import { useTabLabel } from "@/components/app-title-bar/use-tab-label";
import {
  WindowTitleBarButton,
  WindowTitleBarGroup,
  WindowTitleBarTab,
  WindowTitleBarTabs,
} from "@/components/ui/window-title-bar";
import { currentPath, type AppTab } from "@/lib/tabs";
import { useAppTabs } from "@/lib/use-app-tabs";

// The window's tabs (SLJ-12), after the title bar's buttons, and + for a new
// tab on Home. Dragged to reorder them, or moved with ⌘⇧← / ⌘⇧→ (SLJ-148).
// The first tab lines up with the page card below (`useAlignWithPage`).
export function AppTabBar() {
  const { t } = useTranslation();
  const tabs = useAppTabs();
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useTabDrag(stripRef, tabs.move);
  const announcement = useMoveAnnouncement();
  const indent = useAlignWithPage(stripRef);

  return (
    <WindowTitleBarTabs
      aria-label={t("titleBar.tabs")}
      data-testid="app-tabs"
      ref={stripRef}
      style={indent ? { paddingLeft: indent } : undefined}
    >
      {tabs.state.tabs.map((tab, index) => (
        <AppTabItem
          active={tab.id === tabs.state.activeId}
          isDragged={drag.draggedId === tab.id}
          isSettling={drag.isSettling}
          key={tab.id}
          offset={drag.offsetOf(index, tab.id)}
          onPointerDown={(event) => drag.onPointerDown(event, tab.id, index)}
          tab={tab}
        />
      ))}
      <WindowTitleBarGroup>
        <WindowTitleBarButton
          aria-label={t("titleBar.newTab")}
          data-testid="app-tab-new"
          onClick={() => tabs.open()}
          title={t("titleBar.newTab")}
        >
          <Plus aria-hidden="true" />
        </WindowTitleBarButton>
      </WindowTitleBarGroup>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </WindowTitleBarTabs>
  );
}

// "Tab moved to position 2 of 4", read out when the active tab changes place
// among the same tabs (dragged or moved by keyboard), for screen readers.
function useMoveAnnouncement(): string {
  const { t } = useTranslation();
  const tabs = useAppTabs();
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef(tabs.state);

  useEffect(() => {
    const before = previous.current;
    previous.current = tabs.state;
    const ids = tabs.state.tabs.map((tab) => tab.id);
    const sameTabs = before.tabs.length === ids.length && before.tabs.every((tab) => ids.includes(tab.id));
    const position = ids.indexOf(tabs.state.activeId);
    if (sameTabs && before.activeId === tabs.state.activeId && before.tabs[position]?.id !== tabs.state.activeId) {
      setAnnouncement(t("titleBar.tabMoved", { count: ids.length, position: position + 1 }));
    }
  }, [t, tabs.state]);

  return announcement;
}

function AppTabItem({
  active,
  isDragged,
  isSettling,
  offset,
  onPointerDown,
  tab,
}: {
  active: boolean;
  isDragged: boolean;
  isSettling: boolean;
  offset: number;
  onPointerDown: (event: PointerEvent) => void;
  tab: AppTab;
}) {
  const { t } = useTranslation();
  const tabs = useAppTabs();
  const { icon, label } = useTabLabel(currentPath(tab));

  return (
    <WindowTitleBarTab
      active={active}
      closeLabel={t("titleBar.closeTab")}
      data-dragging={isDragged ? "" : undefined}
      data-settling={isSettling ? "" : undefined}
      data-testid="app-tab"
      icon={icon}
      onClose={() => tabs.close(tab.id)}
      onPointerDown={onPointerDown}
      onSelect={() => tabs.activate(tab.id)}
      style={offset ? { transform: `translateX(${offset}px)` } : undefined}
      title={label}
    >
      {label}
    </WindowTitleBarTab>
  );
}
