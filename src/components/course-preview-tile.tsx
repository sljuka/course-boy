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
        appearance="squareTileMd"
        className={onSelect ? undefined : "cursor-default disabled:opacity-100"}
        disabled={!onSelect}
        onClick={onSelect ? () => onSelect(item) : undefined}
        size={null}
        variant="secondary"
      >
        {children}
      </Button>
      <span className="max-w-32 text-center text-sm font-semibold text-stone-900">
        {label}
      </span>
    </div>
  );
}
