import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useTransferQuery } from "@/lib/sharing-queries";
import { formatBytes, isNobodyOnline, transferPercent } from "@/lib/transfer-progress";
import { useAppState } from "@/lib/use-app-state";

// An import or update download in progress (SLJ-43): "Looking for the
// course…" until someone sharing it is reachable (and, after a while, that
// nobody is online right now), then "Downloading 12 MB of 48 MB · 2.1 MB/s"
// with a progress bar. Cancel is always available; nothing gives up by itself.
export function TransferProgress({ onCancel, transferId }: { onCancel: () => void; transferId: string }) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: transfer } = useTransferQuery(transferId);
  const percent = transfer ? transferPercent(transfer) : null;
  const isDownloading = transfer?.phase === "downloading" && percent !== null;

  return (
    <div className="flex flex-col gap-2" data-testid="transfer-progress">
      {isDownloading ? (
        <>
          <Progress value={percent} />
          <CardDescription data-testid="transfer-progress-text">
            {t("transfer.downloading", {
              done: formatBytes(transfer.bytesDone, locale),
              total: formatBytes(transfer.bytesTotal ?? 0, locale),
            })}
            {transfer.speed > 0 && ` · ${t("transfer.speed", { speed: formatBytes(transfer.speed, locale) })}`}
          </CardDescription>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Spinner aria-hidden="true" />
          <CardDescription data-testid="transfer-progress-text">{t("transfer.finding")}</CardDescription>
        </div>
      )}
      {transfer && isNobodyOnline(transfer) && (
        <CardDescription data-testid="transfer-nobody-online">{t("transfer.nobodyOnline")}</CardDescription>
      )}
      <div className="flex justify-end">
        <Button data-testid="cancel-transfer" onClick={onCancel} size="sm" variant="secondary">
          {t("transfer.cancel")}
        </Button>
      </div>
    </div>
  );
}
