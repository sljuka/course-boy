import { useTranslation } from "react-i18next";

import { LessonBlocks } from "@/components/course-player/lesson-blocks";
import { Button } from "@/components/ui/button";
import type { CourseLesson } from "@/lib/course-package";

export const CourseLessonContent = ({
  activeLesson,
  courseId,
  onContinueFromLesson,
}: {
  activeLesson: CourseLesson;
  courseId: string;
  onContinueFromLesson: (lesson: CourseLesson) => void;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <LessonBlocks courseId={courseId} source={activeLesson.body} />
      <div className="flex justify-end print:hidden">
        <Button onClick={() => onContinueFromLesson(activeLesson)} size="lg">
          {t("continue")}
        </Button>
      </div>
    </>
  );
};
