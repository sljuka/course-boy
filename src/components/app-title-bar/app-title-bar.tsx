import { ArrowLeft, ArrowRight, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { RecentlyViewedMenu } from "@/components/app-title-bar/recently-viewed-menu";
import {
  WindowTitleBar,
  WindowTitleBarButton,
  WindowTitleBarGroup,
} from "@/components/ui/window-title-bar";
import { useAppState } from "@/lib/use-app-state";
import { useHistoryAvailability } from "@/lib/use-history-availability";
import { useTitleBarSidebar } from "@/lib/use-title-bar-sidebar";

// The window's title bar (the native one is hidden — see electron/main.ts):
// sidebar toggle, back/forward through in-app history, and recently viewed
// courses. Each control is disabled when it has nothing to act on.
function AppTitleBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canGoBack, canGoForward } = useHistoryAvailability();
  const { toggle: toggleSidebar } = useTitleBarSidebar();
  const { isLoaded } = useAppState();

  // Rendered together with the routes (see `AppRoutes`), once preferences have
  // loaded — so the first thing that mounts is the page the app actually
  // starts on (e.g. the onboarding redirect), not a bar over an empty window.
  if (!isLoaded) {
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
          disabled={!canGoBack}
          onClick={() => navigate(-1)}
          title={t("titleBar.back")}
        >
          <ArrowLeft aria-hidden="true" />
        </WindowTitleBarButton>
        <WindowTitleBarButton
          aria-label={t("titleBar.forward")}
          disabled={!canGoForward}
          onClick={() => navigate(1)}
          title={t("titleBar.forward")}
        >
          <ArrowRight aria-hidden="true" />
        </WindowTitleBarButton>
        <RecentlyViewedMenu />
      </WindowTitleBarGroup>
    </WindowTitleBar>
  );
}

export { AppTitleBar };
