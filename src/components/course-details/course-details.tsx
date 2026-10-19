import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCheck, History, Home, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { BoardShownMenuItem } from "@/components/course-board/board-shown-menu-item";
import { CourseBoardPanel } from "@/components/course-board/course-board-panel";
import { CourseViewTabs } from "@/components/course-board/course-view-tabs";
import { CourseLoadingCard } from "@/components/course-loading-card";
import {
  buildSectionPreviewItems,
  type CoursePreviewStripItem,
} from "@/components/course-preview-strip-items";
import {
  CoursePreviewStrip,
} from "@/components/course-preview-strip";
import { CourseActionsMenu } from "@/components/course-actions-menu";
import { CourseFavoriteToggle } from "@/components/course-progress/course-favorite-toggle";
import { CourseProgressBadge } from "@/components/course-progress/course-progress-badge";
import { PageContent } from "@/components/page-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourseBoardQuery } from "@/lib/board-queries";
import { useCourseProgressQuery } from "@/lib/course-progress-queries";
import { courseViewFromState, type CourseView } from "@/lib/course-view";
import { boardIfOn } from "@/lib/course-board";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { useCourseSharingQuery } from "@/lib/sharing-queries";
import { CourseInfoSidePanel } from "@/components/course-details/course-info-panel";
import { CourseUpdateNotice } from "@/components/course-details/course-update-notice";
import { CourseVersionMenu } from "@/components/course-details/course-version-menu";
import { ShareCourseButton } from "@/components/course-details/share-course-button";
import { VersionHistoryDialog } from "@/components/course-details/version-history-dialog";
import {
  buildLessonPath,
  buildLessonTestPath,
  getEntryStep,
} from "@/lib/course-utils";
import { truncateSummary } from "@/lib/section-summary";
import { useAppState } from "@/lib/use-app-state";

export const CourseDetails = ({ courseId }: { courseId: string }) => {
  const navigate = useNavigate();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const { data: progress } = useCourseProgressQuery();
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const location = useLocation();
  const [view, setView] = useState<CourseView>(() => courseViewFromState(location.state));
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });
  const isPreview = Boolean(course?.preview);
  const { data: sharing } = useCourseSharingQuery(
    course?.distribution === "imported" && !isPreview ? courseId : undefined,
  );
  // An imported course's board (SLJ-149): "Course | Board" while it's on. The
  // teacher's own course has them in the editor instead.
  const { data: board } = useCourseBoardQuery(
    course?.distribution === "imported" && !isPreview ? courseId : undefined,
  );
  const boardOn = boardIfOn(board);
  const shownView: CourseView = boardOn ? view : "course";

  if (isLoading) {
    return (
      <PageContent>
        <CourseLoadingCard message={t("courseDetails.loading")} />
      </PageContent>
    );
  }

  // Not on this device: a link to it (SLJ-60) from someone else's lesson, or
  // a course removed since. Getting it takes its code, from whoever shares it.
  if (!course) {
    return (
      <PageContent>
        <Card className="overflow-hidden" data-testid="course-missing">
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <CardTitle>{t("courseDetails.missingTitle")}</CardTitle>
            <CardDescription>{t("courseDetails.missing")}</CardDescription>
            <Button onClick={() => navigate("/")} size="sm" variant="secondary">
              <Home aria-hidden="true" />
              {t("courseDetails.missingGoHome")}
            </Button>
          </CardContent>
        </Card>
      </PageContent>
    );
  }

  const resolvedCourse = course;
  const entryStep = getEntryStep(resolvedCourse);

  function handlePreviewItemSelect(item: CoursePreviewStripItem) {
    const targetLessonId = item.targetLessonId ?? item.id;

    if (item.kind === "test") {
      navigate(buildLessonTestPath(courseId, targetLessonId));
      return;
    }

    navigate(buildLessonPath(courseId, targetLessonId));
  }

  function startCourse() {
    if (!entryStep) {
      return;
    }

    navigate(
      entryStep.kind === "lesson"
        ? buildLessonPath(courseId, entryStep.id)
        : buildLessonTestPath(courseId, entryStep.id),
    );
  }

  const actions = (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={t("courseDetails.startCourse")}
              disabled={!entryStep}
              onClick={startCourse}
              shape="circle"
              size="icon-sm"
            />
          }
        >
          <Play aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("courseDetails.startCourse")}</TooltipContent>
      </Tooltip>
      {/* Your own course, or an imported one shared publicly (students can
          pass it on); never the bundled one, nor one shared only with you. */}
      {(resolvedCourse.distribution === "local" ||
        (resolvedCourse.distribution === "imported" && Boolean(sharing?.code))) && (
        <ShareCourseButton
          courseId={courseId}
          imported={resolvedCourse.distribution === "imported"}
        />
      )}
      <CourseActionsMenu
        afterRemovePath={resolvedCourse.distribution === "local" ? "/my-courses" : "/"}
        course={resolvedCourse}
        items={resolvedCourse.distribution === "imported" ? <BoardShownMenuItem courseId={courseId} /> : undefined}
      />
    </>
  );

  // On the course itself, so it sits by its crumb (like Linear's ★).
  const crumbActions = <CourseFavoriteToggle courseId={courseId} />;
  const courseProgress = progress?.courses[courseId];

  // Your own course sits under My courses; the bundled and imported ones under Home.
  const breadcrumbs =
    resolvedCourse.distribution === "local"
      ? [
          { icon: BookOpen, label: t("sidebar.myCourses"), to: "/my-courses" },
          { icon: BookOpen, label: resolvedCourse.title },
        ]
      : [
          { icon: Home, label: t("sidebar.home"), to: "/" },
          { icon: BookOpen, label: resolvedCourse.title },
        ];

  const pageHero = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CardTitle size="lg">{resolvedCourse.title}</CardTitle>
          {resolvedCourse.distribution === "imported" ? (
            <CourseVersionMenu courseId={courseId} version={resolvedCourse.version} />
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge className="font-normal" variant="secondary">
                    {t("courseSearch.version", { version: resolvedCourse.version })}
                  </Badge>
                }
              />
              <TooltipContent>{t("courseSearch.versionTooltip")}</TooltipContent>
            </Tooltip>
          )}
          {resolvedCourse.distribution === "local" && (
            <Button
              onClick={() => setIsVersionHistoryOpen(true)}
              size="sm"
              variant="ghost"
            >
              <History aria-hidden="true" className="h-4 w-4" />
              {t("courseVersions.openButton")}
            </Button>
          )}
        </div>
        <CardDescription className="max-w-3xl">
          {resolvedCourse.description}
        </CardDescription>
        <CourseProgressBadge course={resolvedCourse} progress={courseProgress} />
      </div>
    </div>
  );

  const sectionsContent = (
    <>
        {resolvedCourse.sections.length === 0 && (
        <CardDescription data-testid="course-no-sections">{t("courseDetails.noSections")}</CardDescription>
      )}
      {resolvedCourse.sections.map((section) => (
        <Card
          className="overflow-hidden border-border bg-muted/80 shadow-none"
          id={section.id}
          key={section.id}
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-base font-semibold text-foreground">
                {section.title}
              </div>
              {section.description && (
                <CardDescription>{truncateSummary(section.description)}</CardDescription>
              )}
            </div>
            <div className="overflow-x-auto pb-2">
              <CoursePreviewStrip
                items={buildSectionPreviewItems(section, {
                  courseGradeBands: resolvedCourse.gradeBands,
                  introTitle: t("courseDetails.sectionIntro"),
                })}
                onSelect={handlePreviewItemSelect}
                progress={courseProgress}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );

  // A proposed version, before it's approved (SLJ-67): as students would see
  // it, with a way back to its review. Not a course on this device, so no
  // sharing, versions, side panel or star, and its progress isn't kept.
  if (resolvedCourse.preview) {
    const preview = resolvedCourse.preview;
    return (
      <PageContent
        actions={
          <Button data-testid="course-start" disabled={!entryStep} onClick={startCourse} size="sm">
            <Play aria-hidden="true" />
            {t("courseDetails.startCourse")}
          </Button>
        }
        breadcrumbs={[
          { icon: CheckCheck, label: t("sidebar.approvals"), to: "/approvals" },
          { icon: CheckCheck, label: t("maintainers.versionTitle", { version: preview.version }), to: preview.backPath },
          { icon: BookOpen, label: resolvedCourse.title },
        ]}
        pageHero={
          <div className="flex flex-col gap-1">
            <CardTitle size="lg">{resolvedCourse.title}</CardTitle>
            <CardDescription className="max-w-3xl">{resolvedCourse.description}</CardDescription>
          </div>
        }
      >
        <Alert data-testid="course-preview-banner">
          <AlertTitle>{t("maintainers.previewBannerTitle", { version: preview.version })}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            {t("maintainers.previewBannerDescription")}
            <Button data-testid="preview-back" onClick={() => navigate(preview.backPath)} size="sm" variant="secondary">
              <ArrowLeft aria-hidden="true" />
              {t("maintainers.previewBack")}
            </Button>
          </AlertDescription>
        </Alert>
        {sectionsContent}
      </PageContent>
    );
  }

  return (
    <CourseInfoSidePanel course={resolvedCourse}>
      <PageContent
        actionBarStart={boardOn && <CourseViewTabs board={boardOn} onViewChange={setView} view={shownView} />}
        actions={actions}
        breadcrumbs={breadcrumbs}
        crumbActions={crumbActions}
        pageHero={pageHero}
      >
        {resolvedCourse.distribution === "imported" && <CourseUpdateNotice courseId={courseId} />}
        {boardOn && shownView === "board" ? <CourseBoardPanel board={boardOn} courseId={courseId} /> : sectionsContent}
        <VersionHistoryDialog
          courseId={courseId}
          mode="history"
          onOpenChange={setIsVersionHistoryOpen}
          open={isVersionHistoryOpen}
        />
      </PageContent>
    </CourseInfoSidePanel>
  );
};
