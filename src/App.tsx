import { Outlet, Route, Routes } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { AppStateProvider } from "@/lib/app-state";
import { CategoriesPage } from "@/pages/categories-page";
import { RolePage } from "@/pages/role-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";

const HeaderLayout = () => {
  const { locale, setLocale } = useAppState();

  return (
    <main className="min-h-screen">
      <div className="border-b border-stone-300/90 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-6 py-3">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
          <AppMenu />
        </div>
      </div>
      <Outlet />
    </main>
  );
};

const AppRoutes = () => {
  const { isLoaded } = useAppState();

  if (!isLoaded) {
    return null;
  }

  return (
    <Routes>
      <Route element={<HeaderLayout />}>
        <Route
          element={
            <OnboardingGuard>
              <CategoriesPage />
            </OnboardingGuard>
          }
          path="/"
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
