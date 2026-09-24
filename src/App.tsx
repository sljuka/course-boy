import { Route, Routes } from "react-router-dom";

import { BlankLayout } from "@/components/blank-layout";
import { CourseLayout } from "@/components/course-layout";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { SidebarLayout } from "@/components/sidebar-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStateProvider } from "@/lib/app-state";
import { CourseCreatePage } from "@/pages/course-create-page";
import { CourseDetailPage } from "@/pages/course-detail-page";
import { CourseLessonPlayerPage } from "@/pages/course-lesson-player-page";
import { CourseStructurePrototypePage } from "@/pages/course-structure-prototype-page";
import { CourseTestPlayerPage } from "@/pages/course-test-player-page";
import { DraftDetailPage } from "@/pages/draft-detail-page";
import { DraftTestPreviewPage } from "@/pages/draft-test-preview-page";
import { HomePage } from "@/pages/home-page";
import { MyCoursesPage } from "@/pages/my-courses-page";
import { PersonaPage } from "@/pages/persona-page";
import { RolePage } from "@/pages/role-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";

const AppRoutes = () => {
  const { isLoaded } = useAppState();

  if (!isLoaded) {
    return null;
  }

  return (
    <Routes>
      <Route element={<SidebarLayout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<MyCoursesPage />} path="/my-courses" />
        <Route element={<CourseCreatePage />} path="/courses/new" />
        <Route
          element={<CourseStructurePrototypePage />}
          path="/courses/prototype-2"
        />
        <Route element={<CourseDetailPage />} path="/courses/:courseId" />
      </Route>
      <Route element={<CourseLayout />}>
        <Route element={<DraftDetailPage />} path="/drafts/:courseId" />
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
        <Route element={<DraftTestPreviewPage />} path="/drafts/:courseId/preview-test" />
      </Route>
      <Route element={<OnboardingLayout />}>
        <Route element={<WelcomePage />} path="/onboarding" />
        <Route element={<PersonaPage />} path="/onboarding/persona" />
        <Route element={<RolePage />} path="/onboarding/role" />
      </Route>
    </Routes>
  );
};

export const App = () => {
  return (
    <AppStateProvider>
      <TooltipProvider>
        <AppRoutes />
      </TooltipProvider>
    </AppStateProvider>
  );
};
