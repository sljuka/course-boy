import { Route, Routes } from "react-router-dom";

import { HeaderLayout } from "@/components/header-layout";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { AppStateProvider } from "@/lib/app-state";
import { CourseSearchPage } from "@/pages/course-search-page";
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
      <Route
        element={
          <OnboardingGuard>
            <HeaderLayout />
          </OnboardingGuard>
        }
      >
        <Route element={<CourseSearchPage />} path="/" />
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
