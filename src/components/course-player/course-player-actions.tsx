import { RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";

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
          <Button
            aria-label={t("courseDetails.refreshExercise")}
            onClick={onRefreshExercise}
            shape="circle"
            size="icon-sm"
            variant="subtle"
          >
            <RotateCw aria-hidden="true" />
          </Button>
        )}
      </RoleGuard>
      {mnemonicsToggle}
      {printControl}
      <Button
        aria-label={t("courseDetails.closeCourse")}
        onClick={onClose}
        shape="circle"
        size="icon-sm"
        variant="subtle"
      >
        <X aria-hidden="true" />
      </Button>
    </>
  );
};
