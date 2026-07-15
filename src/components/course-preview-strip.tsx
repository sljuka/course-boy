import { BookOpen, ClipboardCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "@/components/ui/button";
import type { CoursePreviewItem, CourseSectionPreview } from "@/lib/course-package";

export type CoursePreviewStripItem = CoursePreviewItem & {
  targetLessonId?: string;
};

export function buildSectionPreviewItems(
  lessons: CourseSectionPreview["lessons"],
): CoursePreviewStripItem[] {
  return lessons.flatMap((lesson) => [
    {
      iconUrl: lesson.iconUrl,
      id: lesson.id,
      kind: "lesson" as const,
      targetLessonId: lesson.id,
      title: lesson.title,
    },
    ...(lesson.test
      ? [
          {
            iconUrl: null,
            id: lesson.test.id,
            kind: "test" as const,
            targetLessonId: lesson.id,
            title: lesson.test.id,
          },
        ]
      : []),
  ]);
}

function formatPreviewItemTitle(
  item: CoursePreviewStripItem,
  testLabel: string,
): string {
  if (item.kind !== "test") {
    return item.title;
  }

  const matchedIndex = item.id.match(/^test-(\d{2})-/);
  const index = matchedIndex?.[1] ?? item.id;

  return testLabel.replace("{{index}}", index);
}

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
      {items.map((item) => {
        const content = item.kind === "test" ? (
          <ClipboardCheck aria-hidden="true" className="h-12 w-12 text-stone-700" />
        ) : item.iconUrl ? (
          <img
            alt=""
            className="h-12 w-12 object-contain"
            src={item.iconUrl}
          />
        ) : (
          <BookOpen aria-hidden="true" className="h-12 w-12 text-stone-700" />
        );

        return (
          <div className="flex flex-col items-center gap-2" key={`${item.kind}-${item.id}`}>
            {onSelect ? (
              <button
                className={buttonVariants({
                  appearance: "squareTileMd",
                  variant: "secondary",
                })}
                onClick={() => onSelect(item)}
                type="button"
              >
                {content}
              </button>
            ) : (
              <div
                className={buttonVariants({
                  appearance: "squareTileMd",
                  variant: "secondary",
                })}
              >
                {content}
              </div>
            )}
            <span className="max-w-32 text-center text-sm font-semibold text-stone-900">
              {formatPreviewItemTitle(item, testLabel)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
