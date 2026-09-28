import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { UnusedDraftAsset } from "@/lib/course-package";
import { useUnusedDraftAssetsQuery } from "@/lib/course-queries";
import { formatFileSize } from "@/lib/format-file-size";
import { useAppState } from "@/lib/use-app-state";

// Up to this many files are listed inline; beyond it the list collapses.
const INLINE_LIMIT = 3;

function UnusedAssetList({ assets }: { assets: UnusedDraftAsset[] }) {
  const { locale } = useAppState();

  return (
    <ul className="flex flex-col gap-0.5">
      {assets.map((asset) => (
        <li key={asset.filename}>
          assets/{asset.filename} · {formatFileSize(asset.sizeBytes, locale)}
        </li>
      ))}
    </ul>
  );
}

// Shown in the cut dialog before cutting: the draft's unused uploads, which the
// cut removes from `draft/assets/` (see `removeUnusedDraftAssets` in
// electron/course-paths.ts). Informational only — it doesn't block the cut.
export function UnusedAssetsWarning({ courseId, open }: { courseId: string; open: boolean }) {
  const { t } = useTranslation();
  const { data: assets = [] } = useUnusedDraftAssetsQuery(courseId, open);

  if (assets.length === 0) {
    return null;
  }

  return (
    <Alert variant="warning">
      <AlertTitle>{t("courseVersions.unusedAssetsTitle", { count: assets.length })}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{t("courseVersions.unusedAssetsDescription")}</span>
        {assets.length <= INLINE_LIMIT ? (
          <UnusedAssetList assets={assets} />
        ) : (
          <Collapsible>
            <CollapsibleTrigger>
              {t("courseVersions.unusedAssetsShow", { count: assets.length })}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <UnusedAssetList assets={assets} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </AlertDescription>
    </Alert>
  );
}
