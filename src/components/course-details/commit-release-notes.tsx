import { useTranslation } from "react-i18next";

import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDraftChangesPreviewQuery } from "@/lib/course-queries";
import { describeCourseChange } from "@/lib/describe-course-change";
import { MissingAssetsAlert } from "./missing-assets-alert";

type CommitReleaseNotesProps = {
  courseId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onRecommendedChange: (recommended: boolean) => void;
  open: boolean;
  recommended: boolean;
};

// The Commit dialog's release notes (SLJ-27, SLJ-29): what changed since the
// newest version (generated, read-only), files the content uses that are
// missing (a warning, never a block), the author's own notes, and "this
// version fixes mistakes", which makes it a recommended update for students.
export function CommitReleaseNotes({
  courseId,
  notes,
  onNotesChange,
  onRecommendedChange,
  open,
  recommended,
}: CommitReleaseNotesProps) {
  const { t } = useTranslation();
  const { data: preview } = useDraftChangesPreviewQuery(courseId, open);

  if (!preview) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {preview.missingAssets.length > 0 && (
        <MissingAssetsAlert missingAssets={preview.missingAssets} />
      )}

      <div className="flex flex-col gap-1.5">
        <Label>
          {preview.baseVersion
            ? t("courseVersions.changesTitle", { version: preview.baseVersion })
            : t("courseVersions.firstVersion")}
        </Label>
        {preview.baseVersion && preview.changes.length === 0 && (
          <CardDescription>
            {t("courseVersions.noChanges", { version: preview.baseVersion })}
          </CardDescription>
        )}
        {preview.changes.length > 0 && (
          <ul className="flex max-h-40 list-disc flex-col gap-0.5 overflow-y-auto pl-5">
            {preview.changes.map((change, index) => (
              <li key={index}>
                <CardDescription>{describeCourseChange(change, t)}</CardDescription>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="commit-release-notes">{t("courseVersions.notesLabel")}</Label>
        <Textarea
          id="commit-release-notes"
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder={t("courseVersions.notesPlaceholder")}
          rows={3}
          value={notes}
        />
      </div>

      <FieldLabel htmlFor="commit-recommended">
        <Field orientation="horizontal">
          <Checkbox
            checked={recommended}
            id="commit-recommended"
            onCheckedChange={(checked) => onRecommendedChange(checked === true)}
          />
          <FieldContent>
            <FieldTitle>{t("courseVersions.recommendedLabel")}</FieldTitle>
            <FieldDescription>{t("courseVersions.recommendedDescription")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </div>
  );
}
