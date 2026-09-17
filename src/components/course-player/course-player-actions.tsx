import { RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";

export const CoursePlayerActions = ({
  isRefreshingAvailable,
  onClose,
  onRefreshExercise,
  printControl,
}: {
  isRefreshingAvailable: boolean;
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
            size="icon"
            variant="secondary"
          >
            <RotateCw aria-hidden="true" className="h-5 w-5" />
          </Button>
        )}
      </RoleGuard>
      {printControl}
      <Button
        aria-label={t("courseDetails.closeCourse")}
        className="h-10! w-10! shrink-0"
        onClick={onClose}
        shape="circle"
        size="icon"
        variant="outline"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </Button>
    </>
  );
};
