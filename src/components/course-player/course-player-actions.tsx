import { Maximize2, Minimize2, RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CopyLinkButton } from "@/components/course-player/copy-link-button";
import { PlayerIconButton } from "@/components/course-player/player-icon-button";
import { RoleGuard } from "@/components/role-guard";
import { IMMERSIVE_SHORTCUT_LABEL, useImmersiveMode } from "@/lib/use-immersive-mode";

export const CoursePlayerActions = ({
  copyLink,
  isRefreshingAvailable,
  mnemonicsToggle,
  onClose,
  onRefreshExercise,
  printControl,
}: {
  // A `matko://` link to what's open (SLJ-60), for its Copy link button.
  copyLink?: string;
  isRefreshingAvailable: boolean;
  // The mnemonics on/off switch, where the content shows mnemonics.
  mnemonicsToggle?: React.ReactNode;
  onClose: () => void;
  onRefreshExercise: () => void;
  printControl: React.ReactNode;
}) => {
  const { t } = useTranslation();
  // Full screen (SLJ-133): the window and this page only, its action bar kept.
  const immersive = useImmersiveMode();

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
      {copyLink && <CopyLinkButton link={copyLink} />}
      {printControl}
      <PlayerIconButton
        label={immersive.isImmersive ? t("courseDetails.exitFullScreen") : t("courseDetails.fullScreen")}
        onClick={immersive.toggle}
        shortcut={IMMERSIVE_SHORTCUT_LABEL}
        testId="player-full-screen"
      >
        {immersive.isImmersive ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
      </PlayerIconButton>
      <PlayerIconButton label={t("courseDetails.closeCourse")} onClick={onClose}>
        <X aria-hidden="true" />
      </PlayerIconButton>
    </>
  );
};
