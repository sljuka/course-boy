import { Download, Library, Pencil, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Page } from "@/components/page/page";
import { ProgramCodeDialog } from "@/components/programs/program-code";
import { ProgramCourseRow } from "@/components/programs/program-course-row";
import { ProgramFavoriteToggle } from "@/components/programs/program-favorite-toggle";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { CoverBanner, CoverLogo } from "@/components/ui/cover-banner";
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { useCoursesQuery } from "@/lib/course-queries";
import { localizeProgram } from "@/lib/program-package";
import { programAssetUrl, useProgramQuery, useProgramSharingQuery, useProgramsQuery } from "@/lib/program-queries";
import { queryClient } from "@/lib/query-client";
import { useImportCourseMutation, usePendingImports } from "@/lib/sharing-queries";
import { useAppState } from "@/lib/use-app-state";

// A program's own page (SLJ-32), like a video channel's: its banner, logo,
// title and description, how many of its courses the student has finished,
// then its courses in order (program-course-row.tsx), each imported from here
// one by one or all at once with Import all. Share shows the program's code,
// for your own programs and imported ones alike. Courses its publisher added
// since the student last looked are marked New, until the next visit.
// Its theme recolors the whole app here and in its courses (ProgramThemeScope).
export function ProgramPage() {
  const { programId } = useParams();
  const { t } = useTranslation();
  const { locale } = useAppState();
  const { data: program, error } = useProgramQuery(programId);
  const { data: courses = [] } = useCoursesQuery(locale);
  const { data: programs = [] } = useProgramsQuery(locale);
  const { data: sharing, isFetchedAfterMount } = useProgramSharingQuery(programId);
  const { data: progress } = useCourseProgressQuery();
  const pendingImports = usePendingImports();
  const importMutation = useImportCourseMutation();
  const [isSharing, setIsSharing] = useState(false);
  // The courses new on arrival (read fresh, not from the cache), kept while
  // the student is here: they're marked seen right away, so they're no
  // longer new next time.
  const [arrival, setArrival] = useState<{ newCourseIds: string[]; programId: string } | null>(null);
  const newCourseIds = arrival && arrival.programId === programId ? arrival.newCourseIds : [];

  useEffect(() => {
    if (!sharing || !programId || !isFetchedAfterMount || arrival?.programId === programId) return;
    setArrival({ newCourseIds: sharing.newCourseIds, programId });
    if (sharing.newCourseIds.length > 0) {
      void window.programs
        .markSeen(programId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["programs", "list"] }));
    }
  }, [arrival, isFetchedAfterMount, programId, sharing]);

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
  const courseOf = (courseId: string) => courses.find((candidate) => candidate.id === courseId);
  const pendingFor = (code: string | null) => pendingImports.find((pending) => code && pending.code === code);
  // Courses Import all would get: shared, not here, not already coming.
  const importable = program.courses.filter(
    (entry) => entry.code && !courseOf(entry.courseId) && !pendingFor(entry.code),
  );
  const finished = program.courses.filter((entry) => {
    const course = courseOf(entry.courseId);
    return course && summarizeCourseProgress(course.stepIds, progress?.courses[entry.courseId]).completedAt;
  }).length;

  function startImport(code: string) {
    importMutation.mutate({ code, transferId: crypto.randomUUID() });
  }

  return (
    <Page
      actions={
        <>
          {importable.length > 0 && (
            <Button
              data-testid="program-import-all"
              onClick={() => importable.forEach((entry) => startImport(entry.code!))}
              size="sm"
              title={t("programSharing.importAll")}
            >
              <Download aria-hidden="true" />
              <ButtonLabel>{t("programSharing.importAll")}</ButtonLabel>
            </Button>
          )}
          {sharing?.code && (
            <Button
              data-testid="program-share"
              onClick={() => setIsSharing(true)}
              size="sm"
              title={t("programSharing.share")}
              variant="secondary"
            >
              <Share2 aria-hidden="true" />
              <ButtonLabel>{t("programSharing.share")}</ButtonLabel>
            </Button>
          )}
          {isOwn && (
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
          )}
        </>
      }
      // By its crumb, like a course's star.
      crumbActions={<ProgramFavoriteToggle programId={program.id} />}
      breadcrumbs={[
        // Your own program: back to My programs (and its editor, from Edit).
        ...(isOwn
          ? [
              {
                icon: Library,
                label: t("sidebar.myPrograms"),
                to: "/my-programs",
              },
            ]
          : []),
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
              <CardDescription data-testid="program-progress">
                {finished > 0
                  ? t("programSharing.finishedCount", {
                      count: program.courses.length,
                      finished,
                    })
                  : t("programs.courseCount", {
                      count: program.courses.length,
                    })}
              </CardDescription>
            </div>
          </div>
        </div>
        {description && <CardDescription className="max-w-3xl whitespace-pre-line">{description}</CardDescription>}

        <ol className="flex flex-col gap-1" data-testid="program-course-list">
          {program.courses.map((entry, index) => (
            <ProgramCourseRow
              course={courseOf(entry.courseId)}
              entry={entry}
              index={index}
              isNew={newCourseIds.includes(entry.courseId)}
              key={entry.courseId}
              onImport={startImport}
              pendingImport={pendingFor(entry.code)}
            />
          ))}
        </ol>
        {program.courses.length === 0 && <CardDescription>{t("programs.noCourses")}</CardDescription>}
      </div>
      <ProgramCodeDialog
        description={t(isOwn ? "programSharing.shareDescription" : "programSharing.shareDescriptionImported")}
        onClose={() => setIsSharing(false)}
        open={isSharing}
        programId={program.id}
        title={t("programSharing.share")}
      />
    </Page>
  );
}
