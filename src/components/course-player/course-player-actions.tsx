import { RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PlayerIconButton } from "@/components/course-player/player-icon-button";
import { RoleGuard } from "@/components/role-guard";

export const CoursePlayerActions = ({
  isRefreshingAvailable,
  mnemonicsToggle,
  onClose,
  onRefreshExercise,
  printControl,
}: {
  isRefreshingAvailable: boolean;
  // The mnemonics on/off switch, where the content shows mnemonics.
  mnemonicsToggle?: React.ReactNode;
  onClose: () => void;
  onRefreshExercise: () => void;
  printControl: React.ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <RoleGuard roles="teacher">
        {isRefreshingAvailable && (
          <PlayerIconButton label={t("courseDetails.refreshExercise")} onClick={onRefreshExercise}>
            <RotateCw aria-hidden="true" />
          </PlayerIconButton>
        )}
      </RoleGuard>
      {mnemonicsToggle}
      {printControl}
      <PlayerIconButton label={t("courseDetails.closeCourse")} onClick={onClose}>
        <X aria-hidden="true" />
      </PlayerIconButton>
    </>
  );
};
