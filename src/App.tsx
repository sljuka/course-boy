import { Route, Routes } from "react-router-dom";

import { AppFrameStatusBar } from "@/components/app-frame/app-frame-status-bar";
import { AppStatusBarProvider } from "@/components/app-frame/app-status-bar-provider";
import { AppTitleBar } from "@/components/app-title-bar/app-title-bar";
import { TitleBarSidebarProvider } from "@/components/app-title-bar/title-bar-sidebar-provider";
import { BlankLayout } from "@/components/blank-layout";
import { KeepSharingDialog } from "@/components/background/keep-sharing-dialog";
import { CourseLayout } from "@/components/course-layout";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { RoleRoute } from "@/components/role-route";
import { SidebarLayout } from "@/components/sidebar-layout";
import { AppShell, AppShellMain } from "@/components/ui/app-shell";
import { ImmersiveModeProvider } from "@/lib/immersive-mode";
import { PublisherPasswordGate } from "@/components/identity/publisher-password-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStateProvider } from "@/lib/app-state";
import { AppTabsProvider } from "@/lib/app-tabs";
import { useAppLinks } from "@/lib/use-app-links";
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
import { MyChannelPage } from "@/pages/my-channel-page";
import { MyProgramsPage } from "@/pages/my-programs-page";
import { ApprovalReviewPage } from "@/pages/approval-review-page";
import { ApprovalsPage } from "@/pages/approvals-page";
import { PublishersPage } from "@/pages/publishers-page";
import { ProgramEditorPage } from "@/pages/program-editor-page";
import { ProgramPage } from "@/pages/program-page";
import { ProgramThemeScope } from "@/components/programs/program-theme-scope";
import { MyCoursesPage } from "@/pages/my-courses-page";
import { PersonaPage } from "@/pages/persona-page";
import { ProfilesPage } from "@/pages/profiles-page";
import { RolePage } from "@/pages/role-page";
import { SettingsPage } from "@/pages/settings-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";
import { useProfilesStateQuery } from "@/lib/profiles-queries";
import { useRefreshOnAgentChanges } from "@/lib/mcp-queries";

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
    // A program recolors the app on its page and in its courses (SLJ-32).
    <ProgramThemeScope>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route element={<HomePage />} path="/" />
          <Route element={<SettingsPage />} path="/settings" />
          <Route element={<CourseDetailPage />} path="/courses/:courseId" />
          <Route element={<ProgramPage />} path="/programs/:programId" />
          {/* A channel (SLJ-31) is stored as a program, and shown by the same page. */}
          <Route element={<ProgramPage />} path="/channels/:programId" />
          <Route element={<PublishersPage />} path="/publishers" />
          {/* Teacher-only pages; see RoleRoute. */}
          <Route element={<RoleRoute roles="teacher" />}>
            <Route element={<MyCoursesPage />} path="/my-courses" />
            <Route element={<MyProgramsPage />} path="/my-programs" />
            <Route element={<MyChannelPage />} path="/my-channel" />
            <Route element={<ApprovalsPage />} path="/approvals" />
            <Route element={<ApprovalReviewPage />} path="/approvals/:publicId/:hash" />
            <Route element={<ProgramEditorPage />} path="/my-programs/:programId" />
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
    </ProgramThemeScope>
  );
};

// The whole window frame renders only once preferences have loaded, so the
// first thing that mounts is the page the app actually starts on (e.g. the
// onboarding redirect) — never an empty frame that redirects a moment later.
//
// Tabs (SLJ-12) only with a profile open and onboarding done: they're saved in
// the profile's preferences. The provider starts over when that changes (the
// end of onboarding), so the first tab opens where the app is then.
const AppFrame = () => {
  const { isLoaded, isOnboarded } = useAppState();
  const { data: profilesState } = useProfilesStateQuery();

  if (!isLoaded || !profilesState) {
    return null;
  }

  const hasTabs = Boolean(profilesState.active) && isOnboarded;

  return (
    <AppTabsProvider key={hasTabs ? "tabs" : "no-tabs"} persist={hasTabs}>
      <AppShell>
        <AppTitleBar showTabs={hasTabs} />
        <AppShellMain>
          <PublisherPasswordGate>
            <AppRoutes />
          </PublisherPasswordGate>
        </AppShellMain>
        <AppFrameStatusBar />
        {/* Asked by main when the window is closed (SLJ-129). */}
        <KeepSharingDialog />
        <AgentChangesRefresher />
        {hasTabs && <AppLinkOpener />}
      </AppShell>
    </AppTabsProvider>
  );
};

// `matko://` links clicked in lessons (SLJ-60), with a profile open.
const AppLinkOpener = () => {
  useAppLinks();
  return null;
};

// What an agent changed over MCP (SLJ-68) shows up on the open page.
const AgentChangesRefresher = () => {
  useRefreshOnAgentChanges();

  return null;
};

const RecentlyViewedTracker = () => {
  useTrackRecentlyViewed();

  return null;
};

export const App = () => {
  return (
    <AppStateProvider>
      <TooltipProvider>
        <ImmersiveModeProvider>
        <TitleBarSidebarProvider>
          <AppStatusBarProvider>
            <RecentlyViewedTracker />
            <AppFrame />
          </AppStatusBarProvider>
        </TitleBarSidebarProvider>
        </ImmersiveModeProvider>
      </TooltipProvider>
    </AppStateProvider>
  );
};
