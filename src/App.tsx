import { Outlet, Route, Routes } from "react-router-dom";

import { AppMenu } from "@/components/app-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { AppStateProvider } from "@/lib/app-state";
import { CategoriesPage } from "@/pages/categories-page";
import { ElementarySchoolPage } from "@/pages/elementary-school-page";
import { ElementarySubjectPage } from "@/pages/elementary-subject-page";
import { HighSchoolPage } from "@/pages/high-school-page";
import { OtherCategoryPage } from "@/pages/other-category-page";
import { PreSchoolPage } from "@/pages/pre-school-page";
import { RolePage } from "@/pages/role-page";
import { TeacherPage } from "@/pages/teacher-page";
import { WelcomePage } from "@/pages/welcome-page";
import { useAppState } from "@/lib/use-app-state";

const HeaderLayout = () => {
  const { locale, setLocale } = useAppState();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="relative z-40 border-b border-stone-300/90 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-6 py-3">
          <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
          <AppMenu />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-8">
        <Outlet />
      </div>
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
      <Route
        element={
          <OnboardingGuard>
            <HeaderLayout />
          </OnboardingGuard>
        }
      >
        <Route element={<CategoriesPage />} path="/" />
        <Route element={<ElementarySchoolPage />} path="/elementary-school" />
        <Route
          element={<ElementarySubjectPage />}
          path="/elementary-school/:subject"
        />
        <Route element={<PreSchoolPage />} path="/pre-school" />
        <Route element={<HighSchoolPage />} path="/high-school" />
        <Route element={<OtherCategoryPage />} path="/other" />
        <Route element={<TeacherPage />} path="/teacher" />
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
