import { Download, Home, Library, Pencil, Radio, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { ChannelProgramList } from "@/components/channels/channel-program-list";
import { ViewOptionsMenu } from "@/components/my-courses/view-options-menu";
import { PublisherName } from "@/components/publishers/publisher-name";
import { Page } from "@/components/page/page";
import { ProgramCodeDialog } from "@/components/programs/program-code";
import { ProgramCourseRow } from "@/components/programs/program-course-row";
import { ProgramFavoriteToggle } from "@/components/programs/program-favorite-toggle";
import { Button, ButtonLabel } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { CoverBanner, CoverLogo } from "@/components/ui/cover-banner";
import { useProgramView } from "@/lib/course-list-view-queries";
import { summarizeCourseProgress } from "@/lib/course-progress";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { useCoursesQuery } from "@/lib/course-queries";
import { localizeProgram } from "@/lib/program-package";
import { usePublishersQuery } from "@/lib/publishers-queries";
import { useCourseAvailability } from "@/lib/course-availability-queries";
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
  const { data: publishers } = usePublishersQuery();
  const availability = useCourseAvailability(
    (program?.courses ?? [])
      .filter((entry) => entry.code && !courses.some((candidate) => candidate.id === entry.courseId))
      .map((entry) => entry.code!),
  );
  const pendingImports = usePendingImports();
  const importMutation = useImportCourseMutation();
  const [isSharing, setIsSharing] = useState(false);
  const [view, setView] = useProgramView();
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
  // A channel (SLJ-31) is shown here too: a publisher's courses and programs.
  const isChannel = program.kind === "channel";
  const KindIcon = isChannel ? Radio : Library;
  const untitled = isChannel ? t("channels.untitled") : t("programs.untitled");
  // Yours (not imported): the page is the editor's preview, with a way back.
  const isOwn = programs.some((candidate) => candidate.id === program.id && candidate.distribution === "local");
  // Who curated it (SLJ-126), as Publishers knows it; not shown for your own.
  const curator = isOwn
    ? null
    : publishers?.find((entry) => entry.sources.some((source) => source.kind === "program" && source.id === program.id));
  const courseOf = (courseId: string) => courses.find((candidate) => candidate.id === courseId);
  const pendingFor = (code: string | null) => pendingImports.find((pending) => code && pending.code === code);
  // Not here yet (SLJ-127): who has each online right now.
  const missingCodes = program.courses
    .filter((entry) => entry.code && !courseOf(entry.courseId) && !pendingFor(entry.code))
    .map((entry) => entry.code!);
  const availableNow = program.courses.filter(
    (entry) => courseOf(entry.courseId) || (entry.code && (availability[entry.code] ?? 0) > 0),
  ).length;
  const isChecking = missingCodes.some((code) => availability[code] === undefined);
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
      actionBarStart={<ViewOptionsMenu onViewChange={setView} view={view} />}
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
              render={<Link to={isChannel ? "/my-channel" : `/my-programs/${program.id}`} />}
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
        // A channel: under Home, where followed channels are listed, or under
        // My channel when it's yours (SLJ-31).
        ...(isChannel
          ? [
              isOwn
                ? { icon: Radio, label: t("sidebar.myChannel"), to: "/my-channel" }
                : { icon: Home, label: t("sidebar.home"), to: "/" },
            ]
          : isOwn
            ? [
                {
                  icon: Library,
                  label: t("sidebar.myPrograms"),
                  to: "/my-programs",
                },
              ]
            : []),
        { icon: KindIcon, label: title || untitled },
      ]}
    >
      <div className="flex flex-col gap-6" data-testid={isChannel ? "channel-page" : "program-page"}>
        <div className="flex flex-col">
          <CoverBanner src={program.banner ? programAssetUrl(program.id, program.banner) : null} />
          <div className="flex flex-wrap items-end gap-4 px-6">
            <CoverLogo className="-mt-12">
              {program.logo ? (
                <img alt="" src={programAssetUrl(program.id, program.logo)} />
              ) : (
                <KindIcon aria-hidden="true" className="size-10!" />
              )}
            </CoverLogo>
            <div className="flex min-w-0 flex-col gap-1 pb-1">
              <CardTitle data-testid="program-title" size="lg">
                {title || untitled}
              </CardTitle>
              {curator && (
                <CardDescription data-testid="program-curator">
                  {isChannel ? t("channels.publishedBy") : t("programs.curatedBy")}{" "}
                  <PublisherName name={curator.claimedName} publisherId={curator.publisherId} />
                </CardDescription>
              )}
              {missingCodes.length > 0 && !isChecking && (
                <CardDescription data-testid="program-availability">
                  {t("availability.summary", { available: availableNow, total: program.courses.length })}
                </CardDescription>
              )}
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

        {isChannel && <CardTitle>{t("channels.courses")}</CardTitle>}
        <ol className={PROGRAM_COURSES_LAYOUT[view]} data-testid="program-course-list">
          {program.courses.map((entry, index) => (
            <ProgramCourseRow
              availability={entry.code ? availability[entry.code] : undefined}
              course={courseOf(entry.courseId)}
              entry={entry}
              index={index}
              isNew={newCourseIds.includes(entry.courseId)}
              key={entry.courseId}
              onImport={startImport}
              pendingImport={pendingFor(entry.code)}
              view={view}
            />
          ))}
        </ol>
        {program.courses.length === 0 && (
          <CardDescription>{isChannel ? t("channels.noCoursesYet") : t("programs.noCourses")}</CardDescription>
        )}
        {isChannel && (program.programs ?? []).length > 0 && (
          <ChannelProgramList entries={program.programs ?? []} onImport={startImport} pendingFor={pendingFor} />
        )}
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

// The program's courses, laid out for each view (SLJ-64).
const PROGRAM_COURSES_LAYOUT = {
  cards: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  list: "flex flex-col gap-3",
  table: "flex flex-col gap-1",
} as const;

