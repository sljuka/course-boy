import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { RegisterTitleBarSidebarToggle } from "@/components/app-title-bar/register-title-bar-sidebar-toggle";
import { SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingGuard } from "./onboarding-guard";

export const SidebarLayout = () => {
  return (
    <OnboardingGuard>
      <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
        <RegisterTitleBarSidebarToggle />
        <div className="flex flex-1 min-h-(--app-content-height) bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <main className="min-h-(--app-content-height) flex justify-center flex-1 bg-background">
              <div className="w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </OnboardingGuard>
  );
};
