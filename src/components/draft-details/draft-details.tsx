import { ArrowLeft, FileText, FolderTree, PencilLine, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";

import { CourseLoadingCard } from "@/components/course-loading-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CourseTitle,
} from "@/components/ui/card";
import { useCourseDetailsQuery } from "@/lib/course-queries";
import { getLocaleFlag } from "@/lib/locale-flags";
import { useAppState } from "@/lib/use-app-state";

export function DraftDetails({ courseId }: { courseId: string }) {
  const { locale, role } = useAppState();
  const { t } = useTranslation();
  const { data: course, isLoading } = useCourseDetailsQuery(courseId, locale, {
    throwOnError: true,
  });

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
            <Button className="gap-2" disabled size="sm">
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t("draftDetails.actions.addSection")}
            </Button>
            <Button className="gap-2" disabled size="sm" variant="secondary">
              <PencilLine aria-hidden="true" className="h-4 w-4" />
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
        <Card className="xl:max-w-sm xl:flex-1" variant="muted">
          <CardHeader
            subtitle={
              <CardDescription>
                {t("draftDetails.structure.description")}
              </CardDescription>
            }
            title={
              <div className="flex items-center gap-2 text-stone-950">
                <FolderTree aria-hidden="true" className="h-5 w-5" />
                <span className="text-lg font-semibold">
                  {t("draftDetails.structure.title")}
                </span>
              </div>
            }
          />
          <CardContent>
            {course.sections.length === 0 ? (
              <Card variant="dashed">
                <CardContent className="gap-2">
                  <div className="text-sm font-semibold text-stone-950">
                    {t("draftDetails.structure.emptyTitle")}
                  </div>
                  <CardDescription>
                    {t("draftDetails.structure.emptyDescription")}
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              course.sections.map((section, index) => (
                <Card key={section.id} variant="dashed">
                  <CardContent className="gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {t("draftDetails.structure.sectionLabel", {
                        index: index + 1,
                      })}
                    </div>
                    <div className="text-base font-semibold text-stone-950">
                      {section.title}
                    </div>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="xl:flex-[1.4]" variant="dashed">
          <CardHeader
            subtitle={
              <CardDescription className="max-w-2xl">
                {t("draftDetails.editor.description")}
              </CardDescription>
            }
            title={
              <div className="flex items-center gap-2 text-stone-950">
                <FileText aria-hidden="true" className="h-5 w-5" />
                <span className="text-lg font-semibold">
                  {course.sections.length === 0
                    ? t("draftDetails.editor.emptyTitle")
                    : t("draftDetails.editor.title")}
                </span>
              </div>
            }
          />
          <CardContent className="gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-stone-950">
                {t("draftDetails.editor.nextStepTitle")}
              </div>
              <CardDescription>
                {course.sections.length === 0
                  ? t("draftDetails.editor.nextStepEmpty")
                  : t("draftDetails.editor.nextStepReady")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" disabled size="lg">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("draftDetails.actions.addSection")}
              </Button>
              <Button className="gap-2" disabled size="lg" variant="secondary">
                <PencilLine aria-hidden="true" className="h-4 w-4" />
                {t("draftDetails.actions.editCourse")}
              </Button>
            </div>
            <Card variant="muted">
              <CardContent className="gap-2">
                <div className="text-sm font-semibold text-stone-950">
                  {t("draftDetails.editor.helperTitle")}
                </div>
                <CardDescription>
                  {t("draftDetails.editor.helperDescription")}
                </CardDescription>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
