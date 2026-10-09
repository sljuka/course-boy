import { BookOpen, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useCourseProgressLabel } from "@/components/course-progress/course-progress-label";
import { usePendingImportView } from "@/components/home/use-pending-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverStepNumber } from "@/components/ui/cover-banner";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import type { CourseSummary } from "@/lib/course-package";
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { localizeProgram, type ProgramCourse } from "@/lib/program-package";
import type { PendingImport } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";

// One course on a program's page (SLJ-32): its number in the program, then
// - on this device: a link to it and how far along the student is;
// - being imported: how the download is going, and Cancel;
// - not yet: the program's snapshot of it and Import (or "Not shared yet"
//   when the curator hasn't published it).
// `isNew`: added by the program's publisher since the student last looked.
export function ProgramCourseRow({
  course,
  entry,
  index,
  isNew,
  onImport,
  pendingImport,
}: {
  course: CourseSummary | undefined;
  entry: ProgramCourse;
  index: number;
  isNew: boolean;
  onImport: (code: string) => void;
  pendingImport: PendingImport | undefined;
}) {
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: progress } = useCourseProgressQuery();
  const snapshot = localizeProgram(
    { defaultLocale: entry.snapshot.supportedLocales[0], locales: entry.snapshot.locales },
    locale,
  );
  const courseProgress = progress?.courses[entry.courseId];
  const progressLabel = useCourseProgressLabel(
    course ? summarizeCourseProgress(course.stepIds, courseProgress) : undefined,
    Boolean(courseProgress?.startedAt),
  );

  return (
    <li data-testid="program-course">
      <ListRow className="h-auto min-h-14 py-2">
        <CoverStepNumber>{index + 1}</CoverStepNumber>
        <BookOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-col">
          {course ? (
            <ListRowLink render={<Link to={`/courses/${course.id}`} />}>{course.title}</ListRowLink>
          ) : (
            <ListRowLink render={<span />}>{snapshot.title || entry.courseId}</ListRowLink>
          )}
          <ListRowMeta fill>{course?.description || snapshot.description}</ListRowMeta>
        </div>
        {isNew && (
          <Badge data-testid="program-course-new" variant="info">
            {t("programSharing.newBadge")}
          </Badge>
        )}
        {course ? (
          progressLabel && <Badge variant="secondary">{progressLabel}</Badge>
        ) : pendingImport ? (
          <ProgramCourseImport pendingImport={pendingImport} />
        ) : entry.code ? (
          <ListRowActions>
            <Button
              data-testid="program-course-import"
              onClick={() => onImport(entry.code!)}
              size="xs"
              variant="secondary"
            >
              <Download aria-hidden="true" />
              {t("programSharing.importCourse")}
            </Button>
          </ListRowActions>
        ) : (
          <Badge data-testid="program-course-missing" variant="outline">
            {t("programSharing.notShared")}
          </Badge>
        )}
      </ListRow>
    </li>
  );
}

// A course of the program being imported: its status, and Cancel (or Dismiss
// once it has failed), like Home's Downloading group.
function ProgramCourseImport({ pendingImport }: { pendingImport: PendingImport }) {
  const { t } = useTranslation();
  const { status } = usePendingImportView(pendingImport);

  return (
    <>
      <ListRowMeta emphasized={Boolean(pendingImport.error)} title={status}>
        {status}
      </ListRowMeta>
      <ListRowActions>
        {pendingImport.error ? (
          <Button onClick={pendingImport.dismiss} size="xs" variant="ghost">
            {t("home.dismiss")}
          </Button>
        ) : (
          <Button
            onClick={() => void window.sharing.cancelTransfer(pendingImport.transferId)}
            size="xs"
            variant="ghost"
          >
            {t("transfer.cancel")}
          </Button>
        )}
      </ListRowActions>
    </>
  );
}
