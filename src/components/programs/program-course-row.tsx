import { BookOpen, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useCourseProgressLabel } from "@/components/course-progress/course-progress-label";
import { usePendingImportView } from "@/components/home/use-pending-import";
import { PublishedBy } from "@/components/publishers/publisher-name";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverStepNumber } from "@/components/ui/cover-banner";
import { ListRow, ListRowActions, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import type { CourseListView } from "@/lib/course-list-view";
import type { CourseSummary } from "@/lib/course-package";
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { localizeProgram, type ProgramCourse } from "@/lib/program-package";
import type { PendingImport } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";

// One course on a program's page (SLJ-32): its number in the program, who
// published it (SLJ-126: a program can hold anyone's courses), then
// - on this device: a link to it and how far along the student is;
// - being imported: how the download is going, and Cancel;
// - not yet: the program's snapshot of it and Import (or "Not shared yet"
//   when the curator hasn't published it).
// `isNew`: added by the program's publisher since the student last looked.
// `view` (SLJ-64): a row ("table"), a full-width card ("list") or a small
// card for the wrapping grid ("cards"), with the same contents.
export function ProgramCourseRow({
  course,
  entry,
  index,
  isNew,
  onImport,
  pendingImport,
  view = "table",
}: {
  course: CourseSummary | undefined;
  entry: ProgramCourse;
  index: number;
  isNew: boolean;
  onImport: (code: string) => void;
  pendingImport: PendingImport | undefined;
  view?: CourseListView;
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

  const title = course?.title ?? (snapshot.title || entry.courseId);
  // Who published it (SLJ-126): as the course itself says once it's here
  // (every maintainer), else as the program recorded it.
  const publishers =
    course && course.publishedBy.length > 0
      ? course.publishedBy
      : entry.snapshot.publisherId
        ? [{ name: entry.snapshot.publisherName ?? null, publisherId: entry.snapshot.publisherId }]
        : [];
  const credit = publishers.length > 0 && <PublishedBy publishers={publishers} testId="program-course-publisher" />;
  const description = course?.description || snapshot.description;
  const status = (
    <>
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
    </>
  );

  if (view !== "table") {
    return (
      <li className="min-w-0" data-testid="program-course">
        <Card className="h-full min-w-0" size={view === "cards" ? "sm" : "default"}>
          <CardHeader className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <CoverStepNumber>{index + 1}</CoverStepNumber>
              <CardTitle className="min-w-0 wrap-break-word">
                {course ? <Link to={`/courses/${course.id}`}>{title}</Link> : title}
              </CardTitle>
            </div>
            {credit && <CardDescription>{credit}</CardDescription>}
            {description && <CardDescription>{description}</CardDescription>}
            <div className="flex min-w-0 flex-wrap items-center gap-2">{status}</div>
          </CardHeader>
        </Card>
      </li>
    );
  }

  return (
    <li data-testid="program-course">
      <ListRow className="h-auto min-h-14 py-2">
        <CoverStepNumber>{index + 1}</CoverStepNumber>
        <BookOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-col">
          {course ? (
            <ListRowLink render={<Link to={`/courses/${course.id}`} />}>{title}</ListRowLink>
          ) : (
            <ListRowLink render={<span />}>{title}</ListRowLink>
          )}
          <ListRowMeta fill>{description}</ListRowMeta>
        </div>
        {credit && (
          <ListRowMeta align="end" className="max-w-48" fill>
            {credit}
          </ListRowMeta>
        )}
        {status}
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
