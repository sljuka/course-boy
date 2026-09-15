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

  // A lesson-attached test has no real title of its own (see docs/contracts.md)
  // — its id matches this pattern and `item.title` is just that same id, so a
  // numbered label is synthesized instead. A standalone test's id doesn't
  // match (it's `section-test-XX-*`) and does carry a real title — use it.
  if (!matchedIndex) {
    return item.title;
  }

  return testLabel.replace("{{index}}", matchedIndex[1]);
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
