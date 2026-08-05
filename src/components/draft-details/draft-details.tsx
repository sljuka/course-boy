import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { DraftEditorPanel } from "@/components/draft-details/draft-editor-panel";
import { DraftStructurePanel } from "@/components/draft-details/draft-structure-panel";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CourseTitle } from "@/components/ui/card";
import { useCourseDetailsQuery, useCreateCourseSectionMutation } from "@/lib/course-queries";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useAppState } from "@/lib/use-app-state";

export function DraftDetails({ courseId }: { courseId: string }) {
  const { locale, role } = useAppState();
  const { t } = useTranslation();
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });
  const createSectionMutation = useCreateCourseSectionMutation();
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!course) {
      return;
    }

    if (
      selectedSectionId &&
      course.sections.some((section) => section.id === selectedSectionId)
    ) {
      return;
    }

    setSelectedSectionId(course.sections[0]?.id ?? null);
  }, [course, selectedSectionId]);

  const activeSection = useMemo(() => {
    if (!course) {
      return null;
    }

    return (
      course.sections.find((section) => section.id === selectedSectionId) ??
      course.sections[0] ??
      null
    );
  }, [course, selectedSectionId]);

  if (role !== "teacher") {
    return <Navigate replace to="/" />;
  }

  if (isLoading) {
    return <CourseLoadingCard message={t("draftDetails.loading")} />;
  }

  if (!course) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-10 text-sm text-stone-600">
          {t("draftDetails.missing")}
        </CardContent>
      </Card>
    );
  }

  if (course.status !== "draft") {
    return <Navigate replace to={`/courses/${courseId}`} />;
  }

  const lessonCount = course.sections.reduce(
    (count, section) => count + section.lessons.length,
    0,
  );

  return (
    <>
      <PageHeader
        right={
          <>
            <Button
              className="gap-2"
              disabled={isCreatingSection || createSectionMutation.isPending}
              onClick={() => setIsCreatingSection(true)}
              size="sm"
            >
              {t("draftDetails.actions.addSection")}
            </Button>
            <Button className="gap-2" disabled size="sm" variant="secondary">
              {t("draftDetails.actions.editCourse")}
            </Button>
          </>
        }
        subtitle={
          <CardDescription className="max-w-3xl text-base text-stone-600">
            {course.description}
          </CardDescription>
        }
        title={
          <div className="flex flex-wrap items-center gap-3">
            <CourseTitle>{course.title}</CourseTitle>
            <Badge variant="draft">{t("draftDetails.badges.draft")}</Badge>
          </div>
        }
        top={
          <div className="px-2">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
              to="/drafts"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t("draftDetails.back")}
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge>{course.id}</Badge>
          <Badge variant="secondary">
            {t("draftDetails.meta.version", { version: course.version })}
          </Badge>
          <Badge variant="secondary">
            {t("draftDetails.meta.sections", { count: course.sections.length })}
          </Badge>
          <Badge variant="secondary">
            {t("draftDetails.meta.lessons", { count: lessonCount })}
          </Badge>
          {course.supportedLocales.map((supportedLocale) => (
            <Badge className="gap-2" key={supportedLocale} variant="secondary">
              <span aria-hidden="true" className="text-base leading-none">
                {getLocaleFlag(supportedLocale)}
              </span>
              <span>{supportedLocale}</span>
            </Badge>
          ))}
        </div>
      </PageHeader>
      <div className="flex flex-col gap-4 xl:flex-row">
        <DraftStructurePanel sections={course.sections} />
        <DraftEditorPanel
          activeSection={activeSection}
          isCreatingSection={isCreatingSection}
          isPending={createSectionMutation.isPending}
          onCancelCreateSection={() => {
            setIsCreatingSection(false);
          }}
          onOpenCreateSection={() => {
            setIsCreatingSection(true);
          }}
          onSubmitCreateSection={({ description, title }) => {
            createSectionMutation.mutate(
              {
                courseId,
                description,
                title,
              },
              {
                onSuccess: ({ sectionId }) => {
                  setSelectedSectionId(sectionId);
                  setIsCreatingSection(false);
                },
              },
            );
          }}
        />
      </div>
    </>
  );
}
