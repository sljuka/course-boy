import { useTranslation } from "react-i18next";

import { usePendingImportView } from "@/components/home/use-pending-import";
import { TransferProgress } from "@/components/transfer-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIcon } from "@/components/ui/status-icon";
import type { PendingImport } from "@/lib/sharing-queries";

// An import in Home's list view (SLJ-49): the course's title once known, then
// the full progress (bar, sizes, speed, Cancel), or the error and Dismiss.
export function PendingImportCard({ pendingImport }: { pendingImport: PendingImport }) {
  const { t } = useTranslation();
  const { progress, title } = usePendingImportView(pendingImport);

  return (
    <Card className="min-w-0 overflow-hidden" data-testid="pending-import">
      <CardContent className="flex min-w-0 flex-col gap-3">
        <CardHeader className="min-w-0">
          <CardTitle className="flex min-w-0 items-center gap-x-2">
            {!pendingImport.error && <StatusIcon progress={progress} status="downloading" />}
            <span className="min-w-0 wrap-break-word">{title}</span>
          </CardTitle>
        </CardHeader>
        {pendingImport.error ? (
          <>
            <Alert variant="destructive">
              <AlertTitle>{t("importCourse.errorTitle")}</AlertTitle>
              <AlertDescription>{pendingImport.error.message}</AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={pendingImport.dismiss} size="sm" variant="secondary">
                {t("home.dismiss")}
              </Button>
            </div>
          </>
        ) : (
          <TransferProgress
            onCancel={() => void window.sharing.cancelTransfer(pendingImport.transferId)}
            transferId={pendingImport.transferId}
          />
        )}
      </CardContent>
    </Card>
  );
}
