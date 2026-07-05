import { Route, Routes, useLocation } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { AppStateProvider } from "@/lib/app-state";
import { CategoriesPage } from "@/pages/categories-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";

function AppRoutes() {
  const { isLoaded, locale, setLocale } = useAppState();
  const location = useLocation();
  const isOnboardingRoute = location.pathname === "/onboarding";

  if (!isLoaded) {
    return null;
  }

  return (
    <main className="min-h-screen">
      {!isOnboardingRoute ? (
        <div className="border-b border-stone-200/80 bg-white/70 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-6 py-4">
            <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
            <AppMenu />
          </div>
        </div>
      ) : null}
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
    </main>
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
