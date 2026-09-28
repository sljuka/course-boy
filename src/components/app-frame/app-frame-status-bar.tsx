import { useLocation } from "react-router-dom";

import { AppStatusBar, AppStatusBarGroup } from "@/components/ui/app-status-bar";
import { useAppStatusBar } from "@/lib/use-app-status-bar";
import { useAppState } from "@/lib/use-app-state";

// The bottom row of the app frame. Shown on every page except onboarding, even
// when empty, so the frame keeps its shape. The start group is for global
// items (help, sharing status — none yet); the end group is filled by the
// current route layout through `AppStatusBarEnd`.
function AppFrameStatusBar() {
  const { isLoaded } = useAppState();
  const { pathname } = useLocation();
  const { setEndElement } = useAppStatusBar();

  if (!isLoaded || pathname.startsWith("/onboarding")) {
    return null;
  }

  return (
    <AppStatusBar>
      <AppStatusBarGroup />
      <AppStatusBarGroup ref={setEndElement} />
    </AppStatusBar>
  );
}

export { AppFrameStatusBar };
