import { useState } from "react";
import { ArrowLeft, History, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import {
  buildSectionPreviewItems,
  type CoursePreviewStripItem,
} from "@/components/course-preview-strip-items";
import {
  CoursePreviewStrip,
} from "@/components/course-preview-strip";
import { PageActions } from "@/components/page-actions";
import { PageContent } from "@/components/page-content";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { ShareCourseDialog } from "@/components/course-details/share-course-dialog";
import { VersionHistoryDialog } from "@/components/course-details/version-history-dialog";
import {
  buildLessonPath,
  buildLessonTestPath,
  getEntryStep,
} from "@/lib/course-utils";
import { useAppState } from "@/lib/use-app-state";

export const CourseDetails = ({ courseId }: { courseId: string }) => {
  const navigate = useNavigate();
  const { locale } = useAppState();
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });

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
    <PageActions>
      <Button disabled={!entryStep} onClick={startCourse} size="sm">
        {t("courseDetails.startCourse")}
      </Button>
      <Button onClick={() => setIsShareOpen(true)} size="sm" variant="secondary">
        <Share2 aria-hidden="true" className="h-4 w-4" />
        {t("shareCourse.openButton")}
      </Button>
      <Button
        aria-label={t(isFavorite ? "removeFavoriteCourse" : "favoriteCourse")}
        onClick={() => setIsFavorite((currentValue) => !currentValue)}
        shape="circle"
        size="icon"
        variant={isFavorite ? "default" : "secondary"}
      >
        <Star
          aria-hidden="true"
          className={isFavorite ? "h-5 w-5 fill-current" : "h-5 w-5"}
        />
      </Button>
    </PageActions>
  );

  return (
    <PageContent actions={actions}>
      <PageHeader
        children={<></>}
        right={actions}
        subtitle={
          <CardDescription className="max-w-3xl">
            {resolvedCourse.description}
          </CardDescription>
        }
        title={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CardTitle size="lg">{resolvedCourse.title}</CardTitle>
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
        }
        top={
          <div className="px-2">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              to={
                resolvedCourse.distribution === "local"
                  ? `/drafts/${courseId}`
                  : "/"
              }
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t(
                resolvedCourse.distribution === "local"
                  ? "courseDetails.backToEditor"
                  : "courseDetails.back",
              )}
            </Link>
          </div>
        }
      />
      {resolvedCourse.sections.map((section) => (
        <Card
          className="overflow-hidden border-stone-200/80 bg-stone-50/80 shadow-none"
          id={section.id}
          key={section.id}
        >
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-base font-semibold text-foreground">
                {section.title}
              </div>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </div>
            <div className="overflow-x-auto pb-2">
              <CoursePreviewStrip
                items={buildSectionPreviewItems(section)}
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
      <ShareCourseDialog
        courseId={courseId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
      />
    </PageContent>
  );
};
