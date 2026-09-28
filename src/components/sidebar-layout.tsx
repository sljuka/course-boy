import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { RegisterTitleBarSidebarToggle } from "@/components/app-title-bar/register-title-bar-sidebar-toggle";
import { PagePanel } from "@/components/ui/page-panel";
import { SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingGuard } from "./onboarding-guard";

// App sidebar on the frame, the page as a card beside it. Pages render a
// `<Page>` (toolbar + scrolling body) inside the panel.
export const SidebarLayout = () => {
  return (
    <OnboardingGuard>
      <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
        <RegisterTitleBarSidebarToggle />
        <AppSidebar />
        <PagePanel>
          <Outlet />
        </PagePanel>
      </SidebarProvider>
    </OnboardingGuard>
  );
};
