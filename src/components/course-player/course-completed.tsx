import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const CourseCompleted = ({
  onExitPlayer,
}: {
  onExitPlayer: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-1 items-center justify-center overflow-hidden border-stone-200/80 bg-white/90 shadow-none">
      <CardContent className="max-w-2xl items-center justify-center py-16 text-center">
        <h3 className="text-3xl font-semibold text-stone-950">
          {t("courseDetails.completedTitle")}
        </h3>
        <p className="text-base leading-7 text-stone-600">
          {t("courseDetails.completedDescription")}
        </p>
        <Button onClick={onExitPlayer} size="lg">
          {t("courseDetails.closeCourse")}
        </Button>
      </CardContent>
    </Card>
  );
};
