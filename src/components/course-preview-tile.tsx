import type { ReactNode } from "react";

import type { CoursePreviewStripItem } from "@/components/course-preview-strip-items";
import { Button } from "@/components/ui/button";

type PreviewTileProps = {
  children: ReactNode;
  item: CoursePreviewStripItem;
  label: string;
  onSelect?: (item: CoursePreviewStripItem) => void;
};

export function PreviewTile({
  children,
  item,
  label,
  onSelect,
}: PreviewTileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        className="h-28 w-28 min-w-28 rounded-2xl border border-border bg-muted/40 p-3 text-center shadow-none"
        disabled={!onSelect}
        onClick={onSelect ? () => onSelect(item) : undefined}
        variant="outline"
      >
        {children}
      </Button>
      <span className="max-w-32 text-center text-sm font-semibold text-stone-900">
        {label}
      </span>
    </div>
  );
}
