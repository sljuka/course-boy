import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Ellipsis, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { getTagAccentStyle, Tag } from "@/components/ui/tag";
import type { CourseTagDefinition, TestExercise } from "@/components/test-editor-prototype-types";
import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import type { Locale } from "@/lib/i18n";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";

export function ExercisePromptCard({
  canMoveDown,
  canMoveUp,
  collapsed,
  descriptiveTags,
  exercise,
  locale,
  onCollapsedChange,
  onDelete,
  onExerciseChange,
  onMoveDown,
  onMoveUp,
  onToggleTag,
  orderLabel,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  collapsed: boolean;
  descriptiveTags: CourseTagDefinition[];
  exercise: TestExercise;
  locale: Locale;
  onCollapsedChange: (exerciseId: string, collapsed: boolean) => void;
  onDelete: (exerciseId: string) => void;
  onExerciseChange: (
    exerciseId: string,
    updater: (exercise: TestExercise) => TestExercise,
  ) => void;
  onMoveDown: (exerciseId: string) => void;
  onMoveUp: (exerciseId: string) => void;
  onToggleTag: (exerciseId: string, tagId: string) => void;
  /** Position within the test ("1", "2", ...), or "–" when exercise randomization picks at random. */
  orderLabel: string;
}) {
  const collapsedPromptPreviewMaxLength = 50;
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const tagPickerAnchor = useComboboxAnchor();
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const { FieldsComponent, label: exerciseKindLabel } = getExerciseKindEditor(
    exercise.kind,
  );

  const promptPreview = useMemo(() => {
    const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();

    if (!normalizedPrompt) {
      return "No prompt yet";
    }

    if (normalizedPrompt.length <= collapsedPromptPreviewMaxLength) {
      return normalizedPrompt;
    }

    return `${normalizedPrompt.slice(0, collapsedPromptPreviewMaxLength)}...`;
  }, [collapsedPromptPreviewMaxLength, prompt]);
  const selectedTags = useMemo(
    () =>
      descriptiveTags.filter((tag) => exercise.tagIds.includes(tag.id)),
    [descriptiveTags, exercise.tagIds],
  );
  const tagPickerItems = useMemo(
    () => descriptiveTags.map((tag) => tag.id),
    [descriptiveTags],
  );
  const descriptiveTagsById = useMemo(
    () =>
      new Map(
        descriptiveTags.map((tag) => [tag.id, tag] as const),
      ),
    [descriptiveTags],
  );
  const firstTag = exercise.tagIds[0]
    ? descriptiveTagsById.get(exercise.tagIds[0])
    : undefined;
  const titleAccentStyle = firstTag ? getTagAccentStyle(firstTag.color) : null;

  function handleTagPickerValueChange(nextValue: string | string[] | null) {
    if (!Array.isArray(nextValue)) {
      return;
    }

    const toggledTagId =
      nextValue.find((tagId) => !exercise.tagIds.includes(tagId)) ??
      exercise.tagIds.find((tagId) => !nextValue.includes(tagId));

    if (toggledTagId) {
      onToggleTag(exercise.id, toggledTagId);
    }
  }

  return (
    <div>
      <Accordion
        className="w-full"
        multiple
        onValueChange={(value) => {
          const isExpanded = value.includes(exercise.id);
          onCollapsedChange(exercise.id, !isExpanded);
        }}
        value={collapsed ? [] : [exercise.id]}
      >
        <AccordionItem value={exercise.id}>
          <div className="flex items-center gap-3 py-2">
            <AccordionTrigger className="min-w-0 flex-1 py-0">
              <div className="flex min-w-0 items-center gap-2 text-left">
                <Badge shape="circle" variant="secondary">
                  {orderLabel}
                </Badge>
                <span
                  className={cn(
                    "border-b-2 border-transparent text-sm font-medium text-foreground",
                    titleAccentStyle?.className,
                  )}
                  style={titleAccentStyle?.style}
                >
                  Exercise
                </span>
                <Badge variant="secondary">{exerciseKindLabel}</Badge>
                {collapsed && (
                  <span className="truncate text-sm text-muted-foreground">
                    {promptPreview}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <Combobox
              filter={(tagId, query) => {
                const normalizedQuery = query.trim().toLocaleLowerCase();

                if (!normalizedQuery) {
                  return true;
                }

                const tag = descriptiveTagsById.get(tagId);

                return (
                  tag?.label.toLocaleLowerCase().includes(normalizedQuery) ??
                  false
                );
              }}
              items={tagPickerItems}
              multiple
              onOpenChange={setIsTagPickerOpen}
              onValueChange={handleTagPickerValueChange}
              open={isTagPickerOpen}
              value={exercise.tagIds}
            >
              <ComboboxContent anchor={tagPickerAnchor} className="w-72">
                <ComboboxInput placeholder="Find a tag" showTrigger={false} />
                <ComboboxEmpty>No descriptive tags defined yet.</ComboboxEmpty>
                <ComboboxList>
                  {(tagId) => {
                    const tag = descriptiveTagsById.get(tagId);

                    if (!tag) {
                      return null;
                    }

                    return (
                      <ComboboxItem key={tag.id} value={tag.id}>
                        <Tag color={tag.color}>{tag.label}</Tag>
                      </ComboboxItem>
                    );
                  }}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <div className="ml-auto">
              <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Exercise actions"
                    className="h-8 w-8"
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <Ellipsis aria-hidden="true" className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  disabled={!canMoveUp}
                  onClick={() => onMoveUp(exercise.id)}
                >
                  <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canMoveDown}
                  onClick={() => onMoveDown(exercise.id)}
                >
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  Move down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(exercise.id)} variant="destructive">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <AccordionContent>
            <div className="flex flex-col gap-4">
              <FieldsComponent
                exercise={exercise}
                locale={locale}
                onChange={(updater) => onExerciseChange(exercise.id, updater)}
              />

              <div
                className="flex flex-wrap items-center gap-3 pt-1"
                ref={tagPickerAnchor}
              >
                {selectedTags.map((tag) => (
                  <Tag className="gap-1.5 pr-1" color={tag.color} key={tag.id}>
                    <span>{tag.label}</span>
                    <button
                      aria-label={`Remove ${tag.label} tag`}
                      className="inline-flex items-center"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleTag(exercise.id, tag.id);
                      }}
                      type="button"
                    >
                      <X aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </Tag>
                ))}
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline decoration-stone-300 underline-offset-4 transition-colors hover:text-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsTagPickerOpen(true);
                  }}
                  type="button"
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  Add tag
                </button>
                <InfoTooltip>Tags are configured in the course root.</InfoTooltip>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
