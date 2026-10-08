import { useTranslation } from "react-i18next";

import { FavoriteToggle } from "@/components/ui/favorite-toggle";
import { useCourseProgressQuery, useSetFavoriteMutation } from "@/lib/course-progress-queries";

// The star on a course's row, card and page (SLJ-50): a favorite shows in
// Home's Favorites group. Kept with the student's progress, on this device.
export function CourseFavoriteToggle({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: progress } = useCourseProgressQuery();
  const { mutate } = useSetFavoriteMutation();
  const isFavorite = progress?.courses[courseId]?.favorite === true;

  return (
    <FavoriteToggle
      data-testid="course-favorite"
      label={isFavorite ? t("courseProgress.unfavorite") : t("courseProgress.favorite")}
      onPressedChange={(favorite) => mutate({ courseId, favorite })}
      pressed={isFavorite}
    />
  );
}
