import { BookOpen, Library, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { useCourseProgressLabel } from "@/components/course-progress/course-progress-label";
import { Page } from "@/components/page/page";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { CoverBanner, CoverLogo, CoverStepNumber } from "@/components/ui/cover-banner";
import { ListRow, ListRowLink, ListRowMeta } from "@/components/ui/list-row";
import type { CourseSummary } from "@/lib/course-package";
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { useCoursesQuery } from "@/lib/course-queries";
import { localizeProgram, type ProgramCourse } from "@/lib/program-package";
import { programAssetUrl, useProgramQuery, useProgramsQuery } from "@/lib/program-queries";
import { useAppState } from "@/lib/use-app-state";

// A program's own page (SLJ-32), like a video channel's: its banner, logo,
// title and description, then its courses in order. A course on this device
// opens its page and shows how far along it is; one that isn't shows the
// program's snapshot of it (importing from here comes with sharing, phase 2).
// Its theme recolors the whole app here and in its courses (ProgramThemeScope).
export function ProgramPage() {
  const { programId } = useParams();
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: program, error } = useProgramQuery(programId);
  const { data: courses = [] } = useCoursesQuery(locale);
  const { data: programs = [] } = useProgramsQuery(locale);

  if (error) {
    return (
      <Page breadcrumbs={[{ icon: Library, label: t("programs.program") }]}>
        <CardDescription>{t("programs.loadError")}</CardDescription>
      </Page>
    );
  }
  if (!program) return null;

  const { description, title } = localizeProgram(program, locale);
  // Yours (not imported): the page is the editor's preview, with a way back.
  const isOwn = programs.some((candidate) => candidate.id === program.id && candidate.distribution === "local");

  return (
    <Page
      actions={
        isOwn && (
          <Button
            data-testid="program-edit"
            nativeButton={false}
            render={<Link to={`/my-programs/${program.id}`} />}
            size="sm"
            title={t("programs.edit")}
            variant="secondary"
          >
            <Pencil aria-hidden="true" />
            <ButtonLabel>{t("programs.edit")}</ButtonLabel>
          </Button>
        )
      }
      breadcrumbs={[
        // Your own program: back to My programs (and its editor, from Edit).
        ...(isOwn ? [{ icon: Library, label: t("sidebar.myPrograms"), to: "/my-programs" }] : []),
        { icon: Library, label: title || t("programs.untitled") },
      ]}
    >
      <div className="flex flex-col gap-6" data-testid="program-page">
        <div className="flex flex-col">
          <CoverBanner src={program.banner ? programAssetUrl(program.id, program.banner) : null} />
          <div className="flex flex-wrap items-end gap-4 px-6">
            <CoverLogo className="-mt-12">
              {program.logo ? (
                <img alt="" src={programAssetUrl(program.id, program.logo)} />
              ) : (
                <Library aria-hidden="true" className="size-10!" />
              )}
            </CoverLogo>
            <div className="flex min-w-0 flex-col gap-1 pb-1">
              <CardTitle data-testid="program-title" size="lg">
                {title || t("programs.untitled")}
              </CardTitle>
              <CardDescription>{t("programs.courseCount", { count: program.courses.length })}</CardDescription>
            </div>
          </div>
        </div>
        {description && <CardDescription className="max-w-3xl whitespace-pre-line">{description}</CardDescription>}

        <ol className="flex flex-col gap-1" data-testid="program-course-list">
          {program.courses.map((entry, index) => (
            <ProgramCourseRow
              course={courses.find((candidate) => candidate.id === entry.courseId)}
              entry={entry}
              index={index}
              key={entry.courseId}
            />
          ))}
        </ol>
        {program.courses.length === 0 && <CardDescription>{t("programs.noCourses")}</CardDescription>}
      </div>
    </Page>
  );
}

function ProgramCourseRow({
  course,
  entry,
  index,
}: {
  course: CourseSummary | undefined;
  entry: ProgramCourse;
  index: number;
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
        {course ? (
          progressLabel && <Badge variant="secondary">{progressLabel}</Badge>
        ) : (
          <Badge data-testid="program-course-missing" variant="outline">
            {t("programs.notOnDevice")}
          </Badge>
        )}
      </ListRow>
    </li>
  );
}
