import { useTranslation } from "react-i18next";

import { ListRow, ListRowMeta } from "@/components/ui/list-row";
import { StatusIcon } from "@/components/ui/status-icon";
import type { RestoredCourseStatus } from "@/lib/identity-backup";
import { formatBytes, transferPercent } from "@/lib/transfer-progress";
import { useAppState } from "@/lib/use-app-state";

// The courses a restored publisher identity brings back (SLJ-54), one row
// each: back on this device, downloading from a student, or waiting for a
// student who has it to come online.
export function RestoredCoursesList({ courses }: { courses: RestoredCourseStatus[] }) {
  const { t } = useTranslation();
  const { locale } = useAppState();

  return (
    <div className="flex flex-col" data-testid="restored-courses">
      {courses.map((course) => {
        const transfer = course.transfer;
        const isDownloading = transfer?.phase === "downloading" && transfer.bytesTotal !== null;
        const percent = transfer ? transferPercent(transfer) : null;

        return (
          <ListRow data-state={course.state} data-testid="restored-course" key={course.id}>
            <StatusIcon
              progress={course.state === "restored" ? undefined : percent === null ? null : percent / 100}
              status={course.state === "restored" ? "published" : "downloading"}
            />
            <span className="min-w-0 flex-1 truncate">{course.title || course.id}</span>
            <ListRowMeta>
              {course.state === "restored"
                ? t("identityRestore.courseRestored")
                : isDownloading
                  ? t("identityRestore.courseDownloading", {
                      done: formatBytes(transfer.bytesDone, locale),
                      total: formatBytes(transfer.bytesTotal ?? 0, locale),
                    })
                  : t("identityRestore.courseWaiting")}
            </ListRowMeta>
          </ListRow>
        );
      })}
    </div>
  );
}
