import { useState } from "react";
import { BookOpen, Folder, History, Home, Play, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import {
  buildSectionPreviewItems,
  type CoursePreviewStripItem,
} from "@/components/course-preview-strip-items";
import {
  CoursePreviewStrip,
} from "@/components/course-preview-strip";
import { CourseActionsMenu } from "@/components/course-actions-menu";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });
  const { data: sharing } = useCourseSharingQuery(course?.distribution === "imported" ? courseId : undefined);

  if (isLoading) {
    return (
      <PageContent>
        <CourseLoadingCard message={t("courseDetails.loading")} />
      </PageContent>
    );
  }

  if (!course) {
    return (
      <PageContent>
        <Card className="overflow-hidden">
          <CardContent className="py-10">
            <CardDescription>{t("courseDetails.missing")}</CardDescription>
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
          iconOnly
          imported={resolvedCourse.distribution === "imported"}
        />
      )}
      <CourseActionsMenu
        afterRemovePath={resolvedCourse.distribution === "local" ? "/my-courses" : "/"}
        course={resolvedCourse}
      />
    </>
  );

  // On the course itself, so it sits by its crumb (like Linear's ★).
  const crumbActions = (
    <Button
      aria-label={t(isFavorite ? "removeFavoriteCourse" : "favoriteCourse")}
      aria-pressed={isFavorite}
      onClick={() => setIsFavorite((currentValue) => !currentValue)}
      shape="circle"
      size="icon-sm"
      title={t(isFavorite ? "removeFavoriteCourse" : "favoriteCourse")}
      variant="subtle"
    >
      <Star aria-hidden="true" className={isFavorite ? "fill-current" : undefined} />
    </Button>
  );

  // Your own course sits under My courses; the bundled and imported ones under Home.
  const breadcrumbs =
    resolvedCourse.distribution === "local"
      ? [
          { icon: BookOpen, label: t("sidebar.myCourses"), to: "/my-courses" },
          { icon: Folder, label: resolvedCourse.title },
        ]
      : [
          { icon: Home, label: t("sidebar.home"), to: "/" },
          { icon: Folder, label: resolvedCourse.title },
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
      </div>
    </div>
  );

  return (
    <CourseInfoSidePanel course={resolvedCourse}>
      <PageContent
        actions={actions}
        breadcrumbs={breadcrumbs}
        crumbActions={crumbActions}
        pageHero={pageHero}
      >
        {resolvedCourse.distribution === "imported" && <CourseUpdateNotice courseId={courseId} />}
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
                  items={buildSectionPreviewItems(section, { introTitle: t("courseDetails.sectionIntro") })}
                  onSelect={handlePreviewItemSelect}
                />
              </div>
            </CardContent>
          </Card>
        ))}
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
