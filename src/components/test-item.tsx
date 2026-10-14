import type { ReactNode } from "react";
import { ClipboardCheck } from "lucide-react";

import { PreviewTile } from "@/components/course-preview-tile";
import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";

type TestItemProps = {
  item: CoursePreviewStripItem;
  onSelect?: (item: CoursePreviewStripItem) => void;
  status?: ReactNode;
  testLabel: string;
  // Which lesson test this is in the strip, 1-based (for its label).
  testNumber: number;
};

function formatPreviewItemTitle(
  item: CoursePreviewStripItem,
  testLabel: string,
  testNumber: number,
): string {
  // A lesson-attached test (`test-…`) has no real title of its own (see
  // docs/contracts.md) — `item.title` is just its id, so a numbered label is
  // synthesized instead, from its place in the strip (ids carry no number).
  // A standalone test (`section-test-…`) does carry a real title — use it.
  if (!item.id.startsWith("test-")) {
    return item.title;
  }

  return testLabel.replace("{{index}}", String(testNumber));
}

export function TestItem({ item, onSelect, status, testLabel, testNumber }: TestItemProps) {
  return (
    <PreviewTile
      item={item}
      label={formatPreviewItemTitle(item, testLabel, testNumber)}
      onSelect={onSelect}
      status={status}
    >
      <ClipboardCheck aria-hidden="true" className="h-12 w-12 text-foreground" />
    </PreviewTile>
  );
}
