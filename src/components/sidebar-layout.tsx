import { Outlet, Route, Routes } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { HomePageActions } from "@/pages/home-page";
import { OnboardingGuard } from "./onboarding-guard";

export const SidebarLayout = () => {
  return (
    <OnboardingGuard>
      <SidebarProvider>
        <div className="flex flex-1 min-h-screen bg-white">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader>
              <Routes>
                <Route element={<HomePageActions />} path="/" />
              </Routes>
            </AppHeader>
            <main className="min-h-screen flex justify-center flex-1 bg-white">
              <div className="w-full lg:max-w-3xl">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </OnboardingGuard>
  );
};
