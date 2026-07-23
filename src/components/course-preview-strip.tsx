import { useTranslation } from "react-i18next";

import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";
import { LessonItem } from "@/components/lesson-item";
import { TestItem } from "@/components/test-item";

type CoursePreviewStripProps = {
  items: CoursePreviewStripItem[];
  onSelect?: (item: CoursePreviewStripItem) => void;
};

export function CoursePreviewStrip({
  items,
  onSelect,
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
            testLabel={testLabel}
          />
        ) : (
          <LessonItem
            item={item}
            key={`${item.kind}-${item.id}`}
            onSelect={onSelect}
          />
        ),
      )}
    </div>
  );
}
