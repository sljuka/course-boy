import { Outlet, Route, Routes } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { HomePageActions } from "@/pages/home-page";
import { OnboardingGuard } from "./onboarding-guard";

export const SidebarFullPageLayout = () => {
  return (
    <OnboardingGuard>
      <SidebarProvider>
        <div className="flex min-h-screen flex-1 bg-white">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader>
              <Routes>
                <Route element={<HomePageActions />} path="/" />
              </Routes>
            </AppHeader>
            <main className="min-h-screen flex-1 border-l border-stone-200 bg-white">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </OnboardingGuard>
  );
};
