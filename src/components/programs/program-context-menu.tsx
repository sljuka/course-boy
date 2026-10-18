import { Star, StarOff } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ProgramCopyCodeItem } from "@/components/copy-code-menu-item";
import { ItemContextMenu } from "@/components/item-context-menu";
import { programAppLink } from "@/lib/app-links";
import { useCourseProgressQuery, useSetProgramFavoriteMutation } from "@/lib/course-progress-queries";

// A program or channel you follow, in a list (Home, a channel's programs) on
// right-click (SLJ-12): Open in new tab, Copy link (SLJ-60), Copy code (once
// it has one) and its star.
export function ProgramContextMenu({
  children,
  href,
  kind = "program",
  programId,
}: {
  children: ReactNode;
  href: string;
  kind?: "channel" | "program";
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
      copyCode={<ProgramCopyCodeItem programId={programId} />}
      copyLink={programAppLink(programId, kind)}
      href={href}
    >
      {children}
    </ItemContextMenu>
  );
}
