import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { usePendingImportView } from "@/components/home/use-pending-import";
import { Button } from "@/components/ui/button";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import type { PendingImport } from "@/lib/sharing-queries";

// An import in Home's table view (SLJ-49): a progress ring, the course's
// title once known, its status, and Cancel (or Dismiss once it has failed).
export function PendingImportRow({ pendingImport }: { pendingImport: PendingImport }) {
  const { t } = useTranslation();
  const { progress, status, title } = usePendingImportView(pendingImport);

  return (
    <ListRow data-testid="pending-import">
      {pendingImport.error ? (
        <CircleAlert aria-label={t("home.importFailed")} className="size-3.5 shrink-0 text-destructive" role="img" />
      ) : (
        <StatusIcon aria-label={status} progress={progress} status="downloading" />
      )}
      <ListRowLink render={<span />}>{title}</ListRowLink>
      <ListRowMeta emphasized={Boolean(pendingImport.error)} fill title={status}>
        {status}
      </ListRowMeta>
      <ListRowActions>
        {pendingImport.error ? (
          <Button onClick={pendingImport.dismiss} size="xs" variant="ghost">
            {t("home.dismiss")}
          </Button>
        ) : (
          <Button
            data-testid="cancel-transfer"
            onClick={() => void window.sharing.cancelTransfer(pendingImport.transferId)}
            size="xs"
            variant="ghost"
          >
            {t("transfer.cancel")}
          </Button>
        )}
      </ListRowActions>
    </ListRow>
  );
}
