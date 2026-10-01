import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { CardDescription } from "@/components/ui/card";
import type { CourseChangelogEntry } from "@/lib/course-package";
import { describeCourseChange } from "@/lib/describe-course-change";

// One version's release notes (in `ReleaseNotesDialog`): "recommended update"
// if it fixes mistakes, the author's notes, then the generated list of changes
// (in the reader's language).
export function VersionNotes({ entry }: { entry: CourseChangelogEntry }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {entry.recommended && (
        <Badge className="self-start" variant="warning">
          {t("courseVersions.recommendedBadge")}
        </Badge>
      )}
      {entry.notes && (
        <CardDescription className="whitespace-pre-wrap text-foreground">{entry.notes}</CardDescription>
      )}
      {entry.changes.length > 0 && (
        <ul className="flex list-disc flex-col gap-0.5 pl-4">
          {entry.changes.map((change, index) => (
            <li key={index}>
              <CardDescription>{describeCourseChange(change, t)}</CardDescription>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
