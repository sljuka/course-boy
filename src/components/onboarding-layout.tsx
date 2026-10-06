import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProfilesStateQuery } from "@/lib/profiles-queries";

// Onboarding keeps its centred card, directly on the app frame (no page panel,
// toolbar or status bar). Scrolls itself if the window is too short. Inside a
// profile it offers Switch profile below the card (SLJ-57): onboarding has no
// sidebar, whose menu is where it lives otherwise. The launcher (which uses
// this layout too) has nothing to switch from.
export const OnboardingLayout = () => {
  const { t } = useTranslation();
  const { data: profilesState } = useProfilesStateQuery();

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
      <section className="flex w-full max-w-2xl flex-col items-center gap-3">
        <Card className="w-full overflow-hidden">
          <CardContent>
            <Outlet />
          </CardContent>
        </Card>
        {profilesState?.active && (
          <Button
            data-testid="onboarding-switch-profile"
            onClick={() => void window.profiles.switchProfile()}
            size="sm"
            variant="ghost"
          >
            <Users aria-hidden="true" />
            {t("menu.switchProfile")}
          </Button>
        )}
      </section>
    </main>
  );
};
