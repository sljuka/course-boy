import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DraftChangesPreview } from "@/lib/course-package";
import { describeCourseLocation } from "@/lib/describe-course-change";

type MissingAsset = DraftChangesPreview["missingAssets"][number];

// Up to this many are listed in full; past it, only the first few show and the
// rest sit behind "Show N more", so a long list doesn't push the dialog away.
const LIST_ALL_UP_TO = 5;
const SHOWN_WHEN_COLLAPSED = 3;

// The Commit dialog's warning for files the content uses that aren't in the
// course (a warning, never a block).
export function MissingAssetsAlert({ missingAssets }: { missingAssets: MissingAsset[] }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const collapses = missingAssets.length > LIST_ALL_UP_TO;
  const shown = collapses ? missingAssets.slice(0, SHOWN_WHEN_COLLAPSED) : missingAssets;
  const hidden = collapses ? missingAssets.slice(SHOWN_WHEN_COLLAPSED) : [];

  const renderItems = (items: MissingAsset[]) =>
    items.map((missing) => {
      const location = describeCourseLocation(missing.location, t);

      return (
        <li key={`${missing.filename}-${location}`}>
          {t("courseVersions.missingItem", { filename: missing.filename, location })}
        </li>
      );
    });

  return (
    <Alert variant="warning">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>
        {/* Plain singular/plural on purpose: i18next plurals would need a
            third ("few") form for Serbian. */}
        {t(
          missingAssets.length === 1
            ? "courseVersions.missingCountOne"
            : "courseVersions.missingCountOther",
          { count: missingAssets.length },
        )}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <ul className="flex flex-col gap-0.5">{renderItems(shown)}</ul>
        {collapses && (
          <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
            <CollapsibleContent className="gap-0.5 pt-0 pb-1">
              <ul className="flex flex-col gap-0.5">{renderItems(hidden)}</ul>
            </CollapsibleContent>
            <CollapsibleTrigger>
              {isExpanded
                ? t("courseVersions.missingShowLess")
                : t("courseVersions.missingShowMore", { count: hidden.length })}
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </AlertDescription>
    </Alert>
  );
}
