import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { appLinkPath, courseIdOfPath, parseAppLink } from "@/lib/app-links";
import { useOptionalAppTabs } from "@/lib/use-app-tabs";

// Opens the `matko://` links clicked in the window (SLJ-60), which main hands
// over instead of loading them: in this tab, or a new one for ⌘-click and a
// middle-click. A link to a course or lesson that isn't on this device opens
// the course's page, which says so.
export function useAppLinks(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = useOptionalAppTabs();
  const latest = useRef({ location, navigate, tabs });
  latest.current = { location, navigate, tabs };

  useEffect(
    () =>
      window.appWindow.onOpenAppLink(({ newTab, url }) => {
        const link = parseAppLink(url);
        if (!link) return;
        const currentPath = latest.current.location.pathname;
        const open = (path: string | null) => {
          if (!path) return;
          const { navigate, tabs } = latest.current;
          if (newTab && tabs) tabs.open(path);
          else navigate(path);
        };
        if (link.kind === "program" || link.kind === "channel") {
          open(appLinkPath(link, { course: null, currentPath }));
          return;
        }
        const courseId = link.courseId ?? courseIdOfPath(currentPath);
        if (!courseId) return;

        void window.courses
          .get(courseId)
          .catch(() => null)
          .then((course) => open(appLinkPath(link, { course, currentPath })));
      }),
    [],
  );
}
