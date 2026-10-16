import { ArrowLeft, ArrowRight, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppTabBar } from "@/components/app-title-bar/app-tab-bar";
import { RecentlyViewedMenu } from "@/components/app-title-bar/recently-viewed-menu";
import {
  WindowTitleBar,
  WindowTitleBarButton,
  WindowTitleBarGroup,
} from "@/components/ui/window-title-bar";
import { useImmersiveMode } from "@/lib/use-immersive-mode";
import { useAppState } from "@/lib/use-app-state";
import { useOptionalAppTabs } from "@/lib/use-app-tabs";
import { useTitleBarSidebar } from "@/lib/use-title-bar-sidebar";

// The window's title bar (the native one is hidden — see electron/main.ts):
// sidebar toggle, back/forward through the active tab's history, recently
// viewed courses, then the tabs (SLJ-12). Each control is disabled when it has
// nothing to act on. No tabs in the launcher and during onboarding.
function AppTitleBar({ showTabs }: { showTabs: boolean }) {
  const { t } = useTranslation();
  const tabs = useOptionalAppTabs();
  const { toggle: toggleSidebar } = useTitleBarSidebar();
  const { isLoaded } = useAppState();
  const { isImmersive } = useImmersiveMode();

  // Rendered together with the routes (see `AppRoutes`), once preferences have
  // loaded — so the first thing that mounts is the page the app actually
  // starts on (e.g. the onboarding redirect), not a bar over an empty window.
  if (!isLoaded || isImmersive) {
    return null;
  }

  return (
    <WindowTitleBar>
      <WindowTitleBarGroup>
        <WindowTitleBarButton
          aria-label={t("titleBar.toggleSidebar")}
          disabled={!toggleSidebar}
          onClick={() => toggleSidebar?.()}
          title={t("titleBar.toggleSidebar")}
        >
          <PanelLeft aria-hidden="true" />
        </WindowTitleBarButton>
        <WindowTitleBarButton
          aria-label={t("titleBar.back")}
          disabled={!tabs?.canGoBack}
          onClick={() => tabs?.back()}
          title={t("titleBar.back")}
        >
          <ArrowLeft aria-hidden="true" />
        </WindowTitleBarButton>
        <WindowTitleBarButton
          aria-label={t("titleBar.forward")}
          disabled={!tabs?.canGoForward}
          onClick={() => tabs?.forward()}
          title={t("titleBar.forward")}
        >
          <ArrowRight aria-hidden="true" />
        </WindowTitleBarButton>
        <RecentlyViewedMenu />
      </WindowTitleBarGroup>
      {showTabs && tabs && <AppTabBar />}
    </WindowTitleBar>
  );
}

export { AppTitleBar };
