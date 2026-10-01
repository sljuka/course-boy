import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { CourseVersionHistoryEntry } from "@/lib/course-package";

// One cut version in the course details page's Version history dialog, with
// Revert. Publishing lives in the editor's Versions panel.
type VersionHistoryRowProps = {
  entry: CourseVersionHistoryEntry;
  isActive: boolean;
  isRevertPending: boolean;
  onRevert: () => void;
};

export function VersionHistoryRow({
  entry,
  isActive,
  isRevertPending,
  onRevert,
}: VersionHistoryRowProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex-row items-center justify-between gap-3 px-3 py-2" size="sm">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <CardTitle>{entry.version}</CardTitle>
          {isActive && (
            <Badge variant="outline">{t("courseVersions.activeBadge")}</Badge>
          )}
          <Badge variant={entry.isCurrentlyPublished ? "default" : "secondary"}>
            {entry.isCurrentlyPublished
              ? t("courseVersions.publishedBadge")
              : t("courseVersions.notPublishedBadge")}
          </Badge>
        </div>
        {entry.cutAt && (
          <CardDescription>{new Date(entry.cutAt).toLocaleString()}</CardDescription>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!isActive && (
          <Button
            disabled={isRevertPending}
            onClick={onRevert}
            size="sm"
            variant="secondary"
          >
            {isRevertPending
              ? t("courseVersions.reverting")
              : t("courseVersions.revertButton")}
          </Button>
        )}
      </div>
    </Card>
  );
}
