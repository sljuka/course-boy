import { Route, Routes } from "react-router-dom";

import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { AppStateProvider } from "@/lib/app-state";
import { CategoriesPage } from "@/pages/categories-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";

function AppRoutes() {
  const { isLoaded } = useAppState();

  if (!isLoaded) {
    return null;
  }

  return (
    <OnboardingLayout>
      <Routes>
        <Route
          element={
            <OnboardingGuard>
              <CategoriesPage />
            </OnboardingGuard>
          }
          path="/"
        />
        <Route element={<WelcomePage />} path="/onboarding" />
      </Routes>
    </OnboardingLayout>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  );
}

export default App;
