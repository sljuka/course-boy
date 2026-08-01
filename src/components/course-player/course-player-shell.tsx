import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { CourseCompleted } from "@/components/course-player/course-completed";
import { CourseLoadingCard } from "@/components/course-loading-card";
import { Card, CardContent } from "@/components/ui/card";
import type { CoursePlayerState } from "@/components/course-player/use-course-player";

type CoursePlayerShellProps = {
  children?: ReactNode;
  playerState: CoursePlayerState;
};

export function CoursePlayerShell({
  children,
  playerState,
}: CoursePlayerShellProps) {
  const { t } = useTranslation();

  if (playerState.status === "loading") {
    return <CourseLoadingCard message={t("courseDetails.loading")} />;
  }

  if (playerState.status === "redirect") {
    return <Navigate replace to={playerState.to} />;
  }

  if (playerState.status === "missing") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10 text-sm text-stone-600">
          {t("courseDetails.missing")}
        </CardContent>
      </Card>
    );
  }

  if (playerState.status === "complete") {
    return <CourseCompleted onExitPlayer={playerState.onExitPlayer} />;
  }

  return <>{children}</>;
}
