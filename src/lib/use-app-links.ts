import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { type AppLink, appLinkPath, courseIdOfPath, newestAppLink } from "@/lib/app-links";
import { useOptionalAppTabs } from "@/lib/use-app-tabs";

// Opens the `matko://` links main keeps for the window (SLJ-8, SLJ-60):
// clicked in a lesson, in another app, or the one that launched the app.
// Mounted only with a profile open, so a link that arrives during the
// launcher or onboarding waits in main until then. A link opens in this tab,
// or a new one for ⌘-click and a middle-click. A course or lesson that isn't
// on this device opens the course's page, which says so; an import link
// opens Import on Home with the code filled in. Of links that arrive
// together, only the newest opens, and a course lookup that a newer link
// overtook is dropped (SLJ-151).
export function useAppLinks(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = useOptionalAppTabs();
  const latest = useRef({ location, navigate, tabs });
  latest.current = { location, navigate, tabs };

  useEffect(() => {
    // Which link is the newest: a slow course lookup for an older one must
    // not open its page over the newer one's.
    let newest = 0;

    function open(path: string | null, newTab: boolean) {
      if (!path) return;
      const { navigate, tabs } = latest.current;
      if (newTab && tabs) tabs.open(path);
      else navigate(path);
    }

    function openLink(link: AppLink, newTab: boolean) {
      const currentPath = latest.current.location.pathname;
      const request = (newest += 1);
      if (link.kind === "course" || link.kind === "lesson") {
        const courseId = link.courseId ?? courseIdOfPath(currentPath);
        if (!courseId) return;
        void window.courses
          .get(courseId)
          .catch(() => null)
          .then((course) => {
            if (request === newest) open(appLinkPath(link, { course, currentPath }), newTab);
          });
        return;
      }
      open(appLinkPath(link, { course: null, currentPath }), newTab);
    }

    function takeWaiting() {
      void window.appWindow.takeAppLinks().then((requests) => {
        const newestLink = newestAppLink(requests);
        if (newestLink) openLink(newestLink.link, newestLink.newTab);
      });
    }

    takeWaiting();
    return window.appWindow.onAppLinksWaiting(takeWaiting);
  }, []);
}
