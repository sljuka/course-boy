import { Route, Routes } from "react-router-dom";

import { BlankLayout } from "@/components/blank-layout";
import { HeaderLayout } from "@/components/header-layout";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { AppStateProvider } from "@/lib/app-state";
import { CourseDetailPage } from "@/pages/course-detail-page";
import { CourseLessonPlayerPage } from "@/pages/course-lesson-player-page";
import { CourseTestPlayerPage } from "@/pages/course-test-player-page";
import { CoursesPage } from "@/pages/courses-page";
import { PlaceholderPage } from "@/pages/placeholder-page";
import { RolePage } from "@/pages/role-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";
import { useTranslation } from "react-i18next";

const AppRoutes = () => {
  const { isLoaded } = useAppState();
  const { t } = useTranslation();

  if (!isLoaded) {
    return null;
  }

  return (
    <Routes>
      <Route
        element={
          <OnboardingGuard>
            <HeaderLayout />
          </OnboardingGuard>
        }
      >
        <Route element={<CoursesPage />} path="/" />
        <Route
          element={
            <PlaceholderPage
              description={t("sidebar.myCoursesDescription")}
              title={t("sidebar.myCourses")}
            />
          }
          path="/my-courses"
        />
        <Route
          element={
            <PlaceholderPage
              description={t("sidebar.draftsDescription")}
              title={t("sidebar.drafts")}
            />
          }
          path="/drafts"
        />
        <Route
          element={
            <PlaceholderPage
              description={t("sidebar.createCourseDescription")}
              title={t("sidebar.createCourse")}
            />
          }
          path="/courses/new"
        />
        <Route element={<CourseDetailPage />} path="/courses/:courseId" />
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
      </Route>
      <Route element={<OnboardingLayout />}>
        <Route element={<WelcomePage />} path="/onboarding" />
        <Route element={<RolePage />} path="/onboarding/role" />
      </Route>
    </Routes>
  );
};

export const App = () => {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  );
};
