import { Outlet } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";

// Onboarding keeps its centred card, directly on the app frame (no page panel,
// toolbar or status bar). Scrolls itself if the window is too short.
export const OnboardingLayout = () => {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
      <section className="w-full max-w-2xl">
        <Card className="overflow-hidden">
          <CardContent>
            <Outlet />
          </CardContent>
        </Card>
      </section>
    </main>
  );
};
