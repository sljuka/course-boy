import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import {
  courseTagColorOptions,
  normalizeCourseTagLabel,
  type CourseTagColor,
  type CourseTagDefinition,
} from "@/lib/course-tags";

const courseTagColorLabels: Record<CourseTagColor, string> = {
  amber: "Amber",
  emerald: "Emerald",
  rose: "Rose",
  sky: "Sky",
  stone: "Stone",
  teal: "Teal",
};

export function TestEditorTagManager({
  hideHeader = false,
  onCreateTag,
  onDeleteTag,
  onUpdateTag,
  tags,
  unstyled = false,
}: {
  hideHeader?: boolean;
  onCreateTag: () => string;
  onDeleteTag: (tagId: string) => void;
  onUpdateTag: (tagId: string, patch: Partial<CourseTagDefinition>) => void;
  tags: CourseTagDefinition[];
  unstyled?: boolean;
}) {
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [pendingFocusTagId, setPendingFocusTagId] = useState<string | null>(
    null,
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setDraftLabels((currentDraftLabels) => {
      const nextDraftLabels = { ...currentDraftLabels };

      for (const tag of tags) {
        if (!(tag.id in nextDraftLabels)) {
          nextDraftLabels[tag.id] = tag.label;
        }
      }

      for (const tagId of Object.keys(nextDraftLabels)) {
        if (!tags.some((tag) => tag.id === tagId)) {
          delete nextDraftLabels[tagId];
        }
      }

      return nextDraftLabels;
    });
  }, [tags]);

  useEffect(() => {
    const timers = tags.map((tag) => {
      const draftLabel = draftLabels[tag.id];
      const normalizedDraftLabel = normalizeCourseTagLabel(draftLabel ?? "");

      if (
        typeof draftLabel !== "string" ||
        normalizedDraftLabel.length === 0 ||
        normalizedDraftLabel === tag.label
      ) {
        return null;
      }

      return window.setTimeout(() => {
        onUpdateTag(tag.id, {
          label: normalizedDraftLabel,
        });
      }, 300);
    });

    return () => {
      for (const timer of timers) {
        if (timer !== null) {
          window.clearTimeout(timer);
        }
      }
    };
  }, [draftLabels, onUpdateTag, tags]);

  function handleCreateTag() {
    const nextTagId = onCreateTag();
    setDraftLabels((currentDraftLabels) => ({
      ...currentDraftLabels,
      [nextTagId]: "",
    }));
    setPendingFocusTagId(nextTagId);
  }

  return (
    <div
      className={
        unstyled
          ? "flex flex-col gap-4"
          : "flex flex-col gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4"
      }
    >
      {!hideHeader && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Descriptive tags</Eyebrow>
          <CardDescription>
            Define the course tag types once, then reuse them across exercises.
          </CardDescription>
        </div>
      )}

      {tags.length > 0 ? (
        <div className="grid gap-2">
          {tags.map((tag) => (
            <div
              className="grid items-center justify-start gap-2 sm:grid-cols-[minmax(7rem,max-content)_10rem_8rem_auto]"
              key={tag.id}
            >
              <span>
                <Tag color={tag.color}>{tag.label}</Tag>
              </span>
              <Input
                className="h-7 text-center text-xs"
                onChange={(event) =>
                  setDraftLabels((currentDraftLabels) => ({
                    ...currentDraftLabels,
                    [tag.id]: event.target.value,
                  }))
                }
                ref={(element) => {
                  inputRefs.current[tag.id] = element;

                  if (element && pendingFocusTagId === tag.id) {
                    element.focus();
                    element.select();
                    setPendingFocusTagId(null);
                  }
                }}
                value={draftLabels[tag.id] ?? tag.label}
              />
              <Select
                onValueChange={(value) =>
                  onUpdateTag(tag.id, { color: value as CourseTagColor })
                }
                value={tag.color}
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courseTagColorOptions.map((color) => (
                    <SelectItem key={color} value={color}>
                      {courseTagColorLabels[color]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                aria-label={`Delete ${tag.label} tag`}
                onClick={() => onDeleteTag(tag.id)}
                size="icon"
                variant="destructive"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <CardDescription>No descriptive tags yet.</CardDescription>
      )}

      <button
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground underline decoration-stone-300 underline-offset-4 transition-colors hover:text-foreground"
        onClick={handleCreateTag}
        type="button"
      >
        + New tag
      </button>
    </div>
  );
}
