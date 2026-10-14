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
  // Lesson tests are labelled "Test 1", "Test 2"… in the order shown.
  const lessonTestNumbers = new Map(
    items
      .filter((item) => item.kind === "test" && item.id.startsWith("test-"))
      .map((item, index) => [item.id, index + 1]),
  );

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
            testNumber={lessonTestNumbers.get(item.id) ?? 0}
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
