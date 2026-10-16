import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

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
// tab on Home.
export function AppTabBar() {
  const { t } = useTranslation();
  const tabs = useAppTabs();

  return (
    <WindowTitleBarTabs aria-label={t("titleBar.tabs")} data-testid="app-tabs">
      {tabs.state.tabs.map((tab) => (
        <AppTabItem active={tab.id === tabs.state.activeId} key={tab.id} tab={tab} />
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
    </WindowTitleBarTabs>
  );
}

function AppTabItem({ active, tab }: { active: boolean; tab: AppTab }) {
  const { t } = useTranslation();
  const tabs = useAppTabs();
  const { icon, label } = useTabLabel(currentPath(tab));

  return (
    <WindowTitleBarTab
      active={active}
      closeLabel={t("titleBar.closeTab")}
      data-testid="app-tab"
      icon={icon}
      onClose={() => tabs.close(tab.id)}
      onSelect={() => tabs.activate(tab.id)}
      title={label}
    >
      {label}
    </WindowTitleBarTab>
  );
}
