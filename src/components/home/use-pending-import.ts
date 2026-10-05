import { useTranslation } from "react-i18next";

import type { PendingImport } from "@/lib/sharing-queries";
import { useTransferQuery } from "@/lib/sharing-queries";
import {
  formatBytes,
  isNobodyOnline,
  transferCourseTitle,
  transferPercent,
} from "@/lib/transfer-progress";
import { useAppState } from "@/lib/use-app-state";

// What Home shows for one import in its Downloading group (SLJ-49): the
// course's title once known, a one-line status, and how far along it is.
export function usePendingImportView(pendingImport: PendingImport) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: transfer } = useTransferQuery(pendingImport.error ? null : pendingImport.transferId);
  const percent = transfer ? transferPercent(transfer) : null;
  const isDownloading = transfer?.phase === "downloading" && percent !== null;

  const status = pendingImport.error
    ? pendingImport.error.message
    : isDownloading
      ? t("transfer.downloading", {
          done: formatBytes(transfer.bytesDone, locale),
          total: formatBytes(transfer.bytesTotal ?? 0, locale),
        })
      : transfer && isNobodyOnline(transfer)
        ? t("transfer.nobodyOnlineShort")
        : t("transfer.finding");

  return {
    progress: isDownloading ? percent / 100 : null,
    status,
    title: transferCourseTitle(transfer, locale) ?? t("home.newCourse"),
  };
}
