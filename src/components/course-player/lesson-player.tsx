import { useState } from "react";
import { Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseLessonContent } from "@/components/course-player/course-lesson-content";
import { CoursePlayerActions } from "@/components/course-player/course-player-actions";
import { PrintOptionsMenu } from "@/components/course-player/print-options-menu";
import { CoursePlayerShell } from "@/components/course-player/course-player-shell";
import { PrintDocumentHeader } from "@/components/course-player/print-document-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CardDescription, LessonTitle } from "@/components/ui/card";
import { defaultLessonPrintOptions } from "@/lib/print-options";
import { buildLessonTestPath } from "@/lib/course-utils";

export function LessonPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [printOptions, setPrintOptions] = useState(defaultLessonPrintOptions);

  return (
    <CoursePlayerShell
      courseId={courseId}
      lessonId={lessonId}
    >
      {({
        activeLesson,
        courseTitle,
        moveToNextLesson,
        progressCurrent,
        progressTotal,
        sectionTitle,
      }) => (
        <>
          <PrintDocumentHeader
            courseTitle={courseTitle}
            label={t("courseDetails.lessonLabel")}
            show={printOptions.showHeader}
            sectionTitle={sectionTitle}
            title={activeLesson.title}
          />
          <div className="print:hidden">
            <PageHeader
              title={<LessonTitle>{courseTitle}</LessonTitle>}
              subtitle={
                <CardDescription className="text-base text-stone-600">
                  {sectionTitle}
                  {" · "}
                  {t("courseDetails.progress", {
                    current: progressCurrent,
                    total: progressTotal,
                  })}
                </CardDescription>
              }
              right={
                <CoursePlayerActions
                  courseId={courseId}
                  isRefreshingAvailable={false}
                  onRefreshExercise={() => {}}
                  printControl={
                    <PrintOptionsMenu
                      onPrint={() => window.print()}
                      onPrintOptionsChange={setPrintOptions}
                      printOptions={printOptions}
                      printHeaderLabel={t("courseDetails.printOptionHeader")}
                      printNowLabel={t("courseDetails.printNow")}
                      title={t("courseDetails.printOptions")}
                    >
                      <Button
                        aria-label={t("courseDetails.printCourse")}
                        className="rounded-full"
                        size="icon"
                        variant="secondary"
                      >
                        <Printer aria-hidden="true" className="h-5 w-5" />
                      </Button>
                    </PrintOptionsMenu>
                  }
                />
              }
            />
          </div>
          <CourseLessonContent
            activeLesson={activeLesson}
            onContinueFromLesson={(lesson) => {
              if (!lesson.test || lesson.test.exercises.length === 0) {
                moveToNextLesson();
                return;
              }

              navigate(buildLessonTestPath(courseId, lesson.id));
            }}
          />
        </>
      )}
    </CoursePlayerShell>
  );
}
