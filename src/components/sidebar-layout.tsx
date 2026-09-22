import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingGuard } from "./onboarding-guard";

export const SidebarLayout = () => {
  return (
    <OnboardingGuard>
      <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
        <div className="flex flex-1 min-h-screen bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <main className="min-h-screen flex justify-center flex-1 bg-background">
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
