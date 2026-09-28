import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { matchPath, useLocation } from "react-router-dom";

import {
  recordRecentlyViewed,
  type RecentlyViewedEntry,
  type RecentlyViewedKind,
} from "@/lib/recently-viewed";

const recentlyViewedQueryKey = ["preferences", "recently-viewed"] as const;

// Routes worth remembering, most specific first. A lesson's test counts as the
// lesson. Draft previews are transient and deliberately not recorded.
const trackedRoutes: { kind: RecentlyViewedKind; pattern: string }[] = [
  { kind: "lesson", pattern: "/courses/:courseId/lessons/:lessonId/test" },
  { kind: "lesson", pattern: "/courses/:courseId/lessons/:lessonId" },
  { kind: "draft", pattern: "/drafts/:courseId" },
  { kind: "course", pattern: "/courses/:courseId" },
];

// Static routes that `/courses/:courseId` would otherwise swallow.
const nonCourseIds = new Set(["new", "prototype-2"]);

export function matchRecentlyViewedRoute(
  pathname: string,
): { courseId: string; kind: RecentlyViewedKind } | null {
  for (const route of trackedRoutes) {
    const courseId = matchPath(route.pattern, pathname)?.params.courseId;

    if (courseId && !nonCourseIds.has(courseId)) {
      return { courseId, kind: route.kind };
    }
  }

  return null;
}

async function readRecentlyViewed(): Promise<RecentlyViewedEntry[]> {
  return (await window.preferences.get()).recentlyViewed ?? [];
}

export function useRecentlyViewedQuery() {
  return useQuery({
    queryKey: recentlyViewedQueryKey,
    queryFn: readRecentlyViewed,
  });
}

// Mounted once, inside the router: records every tracked route the user lands on.
export function useTrackRecentlyViewed(): void {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const match = matchRecentlyViewedRoute(pathname);

    if (!match) {
      return;
    }

    void (async () => {
      const current =
        queryClient.getQueryData<RecentlyViewedEntry[]>(recentlyViewedQueryKey) ??
        (await readRecentlyViewed());
      const next = recordRecentlyViewed(current, {
        ...match,
        path: pathname,
        viewedAt: new Date().toISOString(),
      });

      queryClient.setQueryData(recentlyViewedQueryKey, next);
      await window.preferences.set({ recentlyViewed: next });
    })();
  }, [pathname, queryClient]);
}
