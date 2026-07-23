import { ClipboardCheck } from "lucide-react";

import { PreviewTile } from "@/components/course-preview-tile";
import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";

type TestItemProps = {
  item: CoursePreviewStripItem;
  onSelect?: (item: CoursePreviewStripItem) => void;
  testLabel: string;
};

function formatPreviewItemTitle(
  item: CoursePreviewStripItem,
  testLabel: string,
): string {
  const matchedIndex = item.id.match(/^test-(\d{2})-/);
  const index = matchedIndex?.[1] ?? item.id;

  return testLabel.replace("{{index}}", index);
}

export function TestItem({ item, onSelect, testLabel }: TestItemProps) {
  return (
    <PreviewTile
      item={item}
      label={formatPreviewItemTitle(item, testLabel)}
      onSelect={onSelect}
    >
      <ClipboardCheck aria-hidden="true" className="h-12 w-12 text-stone-700" />
    </PreviewTile>
  );
}
