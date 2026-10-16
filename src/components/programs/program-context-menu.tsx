import { Star, StarOff } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ItemContextMenu } from "@/components/item-context-menu";
import { useCourseProgressQuery, useSetProgramFavoriteMutation } from "@/lib/course-progress-queries";

// A program or channel you follow, in a list (Home, a channel's programs) on
// right-click (SLJ-12): Open in new tab and its star.
export function ProgramContextMenu({
  children,
  href,
  programId,
}: {
  children: ReactNode;
  href: string;
  programId: string;
}) {
  const { t } = useTranslation();
  const { data: progress } = useCourseProgressQuery();
  const { mutate: setFavorite } = useSetProgramFavoriteMutation();
  const isFavorite = progress?.programs?.[programId]?.favorite === true;

  return (
    <ItemContextMenu
      actions={[
        {
          icon: isFavorite ? StarOff : Star,
          id: "favorite",
          label: isFavorite ? t("courseProgress.unfavorite") : t("courseProgress.favorite"),
          onSelect: () => setFavorite({ favorite: !isFavorite, programId }),
        },
      ]}
      href={href}
    >
      {children}
    </ItemContextMenu>
  );
}
