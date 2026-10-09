import { useTranslation } from "react-i18next";

import { FavoriteToggle } from "@/components/ui/favorite-toggle";
import { useCourseProgressQuery, useSetProgramFavoriteMutation } from "@/lib/course-progress-queries";

// A program's star (SLJ-32), on its Home row and by its crumb on its page: a
// starred program shows in the sidebar's Favorites and under `:favorites`.
// Kept with the student's progress, on this device.
export function ProgramFavoriteToggle({ programId }: { programId: string }) {
  const { t } = useTranslation();
  const { data: progress } = useCourseProgressQuery();
  const { mutate } = useSetProgramFavoriteMutation();
  const isFavorite = progress?.programs?.[programId]?.favorite === true;

  return (
    <FavoriteToggle
      data-testid="program-favorite"
      label={isFavorite ? t("courseProgress.unfavorite") : t("courseProgress.favorite")}
      onPressedChange={(favorite) => mutate({ favorite, programId })}
      pressed={isFavorite}
    />
  );
}
