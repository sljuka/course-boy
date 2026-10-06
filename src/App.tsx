import { Route, Routes } from "react-router-dom";

import { AppFrameStatusBar } from "@/components/app-frame/app-frame-status-bar";
import { AppStatusBarProvider } from "@/components/app-frame/app-status-bar-provider";
import { AppTitleBar } from "@/components/app-title-bar/app-title-bar";
import { TitleBarSidebarProvider } from "@/components/app-title-bar/title-bar-sidebar-provider";
import { BlankLayout } from "@/components/blank-layout";
import { CourseLayout } from "@/components/course-layout";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { RoleRoute } from "@/components/role-route";
import { SidebarLayout } from "@/components/sidebar-layout";
import { AppShell, AppShellMain } from "@/components/ui/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStateProvider } from "@/lib/app-state";
import { useTrackRecentlyViewed } from "@/lib/recently-viewed-queries";
import { CourseCreatePage } from "@/pages/course-create-page";
import { CourseDetailPage } from "@/pages/course-detail-page";
import { CourseLessonPlayerPage } from "@/pages/course-lesson-player-page";
import { CourseStructurePrototypePage } from "@/pages/course-structure-prototype-page";
import { CourseTestPlayerPage } from "@/pages/course-test-player-page";
import { DraftDetailPage } from "@/pages/draft-detail-page";
import { DraftLessonPreviewPage } from "@/pages/draft-lesson-preview-page";
import { DraftTestPreviewPage } from "@/pages/draft-test-preview-page";
import { HomePage } from "@/pages/home-page";
import { MyCoursesPage } from "@/pages/my-courses-page";
import { PersonaPage } from "@/pages/persona-page";
import { ProfilesPage } from "@/pages/profiles-page";
import { RolePage } from "@/pages/role-page";
import { SettingsPage } from "@/pages/settings-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";
import { useProfilesStateQuery } from "@/lib/profiles-queries";

const AppRoutes = () => {
  const { isLoaded } = useAppState();
  const { data: profilesState } = useProfilesStateQuery();

  if (!isLoaded || !profilesState) {
    return null;
  }

  // The launcher: no profile open yet (SLJ-57).
  if (!profilesState.active) {
    return (
      <Routes>
        <Route element={<OnboardingLayout />}>
          <Route element={<ProfilesPage />} path="*" />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<SidebarLayout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<CourseDetailPage />} path="/courses/:courseId" />
        {/* Teacher-only pages; see RoleRoute. */}
        <Route element={<RoleRoute roles="teacher" />}>
          <Route element={<MyCoursesPage />} path="/my-courses" />
          <Route element={<CourseCreatePage />} path="/courses/new" />
          <Route
            element={<CourseStructurePrototypePage />}
            path="/courses/prototype-2"
          />
        </Route>
      </Route>
      <Route element={<RoleRoute roles="teacher" />}>
        <Route element={<CourseLayout />}>
          <Route element={<DraftDetailPage />} path="/drafts/:courseId" />
        </Route>
      </Route>
      <Route
        element={
          <OnboardingGuard>
            <BlankLayout />
          </OnboardingGuard>
        }
      >
        <Route
          element={<CourseLessonPlayerPage />}
          path="/courses/:courseId/lessons/:lessonId"
        />
        <Route
          element={<CourseTestPlayerPage />}
          path="/courses/:courseId/lessons/:lessonId/test"
        />
        <Route element={<RoleRoute roles="teacher" />}>
          <Route element={<DraftTestPreviewPage />} path="/drafts/:courseId/preview-test" />
          <Route element={<DraftLessonPreviewPage />} path="/drafts/:courseId/preview-lesson" />
        </Route>
      </Route>
      <Route element={<OnboardingLayout />}>
        <Route element={<WelcomePage />} path="/onboarding" />
        <Route element={<PersonaPage />} path="/onboarding/persona" />
        <Route element={<RolePage />} path="/onboarding/role" />
      </Route>
    </Routes>
  );
};

// The whole window frame renders only once preferences have loaded, so the
// first thing that mounts is the page the app actually starts on (e.g. the
// onboarding redirect) — never an empty frame that redirects a moment later.
const AppFrame = () => {
  const { isLoaded } = useAppState();

  if (!isLoaded) {
    return null;
  }

  return (
    <AppShell>
      <AppTitleBar />
      <AppShellMain>
        <AppRoutes />
      </AppShellMain>
      <AppFrameStatusBar />
    </AppShell>
  );
};

const RecentlyViewedTracker = () => {
  useTrackRecentlyViewed();

  return null;
};

export const App = () => {
  return (
    <AppStateProvider>
      <TooltipProvider>
        <TitleBarSidebarProvider>
          <AppStatusBarProvider>
            <RecentlyViewedTracker />
            <AppFrame />
          </AppStatusBarProvider>
        </TitleBarSidebarProvider>
      </TooltipProvider>
    </AppStateProvider>
  );
};
