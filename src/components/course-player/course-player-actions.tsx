import { Printer, RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export const CoursePlayerActions = ({
  courseId,
  isRefreshingAvailable,
  onPrintCourse,
  onRefreshExercise,
}: {
  courseId: string;
  isRefreshingAvailable: boolean;
  onPrintCourse: () => void;
  onRefreshExercise: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <>
      {isRefreshingAvailable && (
        <Button
          aria-label={t("courseDetails.refreshExercise")}
          className="rounded-full"
          onClick={onRefreshExercise}
          size="icon"
          variant="secondary"
        >
          <RotateCw aria-hidden="true" className="h-5 w-5" />
        </Button>
      )}
      <Button
        aria-label={t("courseDetails.printCourse")}
        className="rounded-full"
        onClick={onPrintCourse}
        size="icon"
        variant="secondary"
      >
        <Printer aria-hidden="true" className="h-5 w-5" />
      </Button>
      <Link
        aria-label={t("courseDetails.closeCourse")}
        className="inline-flex h-10! w-10! shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white px-0 text-stone-700 shadow-xs transition-colors hover:bg-stone-100"
        to={`/courses/${courseId}`}
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </Link>
    </>
  );
};
