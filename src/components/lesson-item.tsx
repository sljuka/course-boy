import { BookOpen } from "lucide-react";

import { PreviewTile } from "@/components/course-preview-tile";
import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";

type LessonItemProps = {
  item: CoursePreviewStripItem;
  onSelect?: (item: CoursePreviewStripItem) => void;
};

export function LessonItem({ item, onSelect }: LessonItemProps) {
  const content = item.iconUrl ? (
    <img
      alt=""
      className="h-12 w-12 object-contain"
      src={item.iconUrl}
    />
  ) : (
    <BookOpen aria-hidden="true" className="h-12 w-12 text-stone-700" />
  );

  return (
    <PreviewTile item={item} label={item.title} onSelect={onSelect}>
      {content}
    </PreviewTile>
  );
}
