import { useTranslation } from "react-i18next";

import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";
import { StepProgressBadge } from "@/components/course-progress/step-progress-badge";
import { LessonItem } from "@/components/lesson-item";
import { TestItem } from "@/components/test-item";
import type { CourseProgress } from "@/lib/course-progress";

type CoursePreviewStripProps = {
  items: CoursePreviewStripItem[];
  onSelect?: (item: CoursePreviewStripItem) => void;
  // The student's progress in this course (SLJ-50): a lesson shows Done, a
  // test its best score.
  progress?: CourseProgress;
};

export function CoursePreviewStrip({
  items,
  onSelect,
  progress,
}: CoursePreviewStripProps) {
  const { t } = useTranslation();
  const testLabel = t("courseSearch.testTile", { index: "{{index}}" });

  return (
    <div className="flex min-w-max gap-3">
      {items.map((item) =>
        item.kind === "test" ? (
          <TestItem
            item={item}
            key={`${item.kind}-${item.id}`}
            onSelect={onSelect}
            status={<StepProgressBadge step={progress?.steps[item.id]} />}
            testLabel={testLabel}
          />
        ) : (
          <LessonItem
            item={item}
            key={`${item.kind}-${item.id}`}
            onSelect={onSelect}
            status={<StepProgressBadge step={progress?.steps[item.id]} />}
          />
        ),
      )}
    </div>
  );
}
