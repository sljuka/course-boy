import { useTranslation } from "react-i18next";

import { LessonMarkdown } from "@/components/course-player/lesson-markdown";
import { Button } from "@/components/ui/button";
import type { CourseLesson } from "@/lib/course-package";

export const CourseLessonContent = ({
  activeLesson,
  onContinueFromLesson,
}: {
  activeLesson: CourseLesson;
  onContinueFromLesson: (lesson: CourseLesson) => void;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <LessonMarkdown source={activeLesson.body} />
      <div className="flex justify-end print:hidden">
        <Button onClick={() => onContinueFromLesson(activeLesson)} size="lg">
          {t("continue")}
        </Button>
      </div>
    </>
  );
};
