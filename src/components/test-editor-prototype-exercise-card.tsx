import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Ellipsis,
  Plus,
  TriangleAlert,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  AccordionCardContent,
  AccordionCardHeader,
  AccordionCardItem,
} from "@/components/ui/accordion-card";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
  Accordion,
} from "@/components/ui/accordion";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import { Textarea } from "@/components/ui/textarea";
import type {
  CourseTagDefinition,
  TestExercise,
  VariableConstraintType,
} from "@/components/test-editor-prototype-types";
import {
  extractPromptVariables,
  formatSampleVariables,
  getConstraintLabel,
  validateExerciseSolution,
} from "@/components/test-editor-prototype-logic";
import type { Locale } from "@/lib/i18n";
import { useComboboxAnchor } from "@/components/ui/use-combobox-anchor";

function getValidationLabel(status: "error" | "valid" | "warning") {
  switch (status) {
    case "error":
      return "Invalid";
    case "warning":
      return "Warning";
    case "valid":
      return "Valid";
  }
}

export function ExercisePromptCard({
  canMoveDown,
  canMoveUp,
  collapsed,
  descriptiveTags,
  exercise,
  locale,
  onAddConstraint,
  onDelete,
  onMoveDown,
  onMoveUp,
  onPromptChange,
  onCollapsedChange,
  onRemoveConstraint,
  onSolutionChange,
  onToggleTag,
  onVariableRemove,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  collapsed: boolean;
  descriptiveTags: CourseTagDefinition[];
  exercise: TestExercise;
  locale: Locale;
  onAddConstraint: (
    exerciseId: string,
    variableId: string,
    type: VariableConstraintType,
    value: number | null,
  ) => void;
  onDelete: (exerciseId: string) => void;
  onMoveDown: (exerciseId: string) => void;
  onMoveUp: (exerciseId: string) => void;
  onCollapsedChange: (exerciseId: string, collapsed: boolean) => void;
  onPromptChange: (exercise: TestExercise, locale: Locale, prompt: string) => void;
  onRemoveConstraint: (
    exerciseId: string,
    variableId: string,
    constraintId: string,
  ) => void;
  onSolutionChange: (exerciseId: string, solution: string) => void;
  onToggleTag: (exerciseId: string, tagId: string) => void;
  onVariableRemove: (exerciseId: string, variableId: string) => void;
}) {
  const [activeConstraintVariableId, setActiveConstraintVariableId] = useState<
    string | null
  >(null);
  const [constraintType, setConstraintType] =
    useState<VariableConstraintType>("min-value");
  const [constraintValue, setConstraintValue] = useState("5");
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const tagPickerAnchor = useComboboxAnchor();
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const solutionRef = useRef<HTMLTextAreaElement | null>(null);
  const prompt = exercise.locales[locale]?.prompt ?? "";
  const usedVariableNames = useMemo(
    () => new Set(extractPromptVariables(prompt)),
    [prompt],
  );
  const solutionValidation = useMemo(
    () => validateExerciseSolution(exercise, usedVariableNames),
    [exercise, usedVariableNames],
  );

  useEffect(() => {
    const textarea = promptRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [prompt]);

  useEffect(() => {
    const textarea = solutionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [exercise.solution]);

  const promptPreview = useMemo(() => {
    const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();

    if (!normalizedPrompt) {
      return "No prompt yet";
    }

    if (normalizedPrompt.length <= 72) {
      return normalizedPrompt;
    }

    return `${normalizedPrompt.slice(0, 72)}...`;
  }, [prompt]);
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

  function submitConstraint(variableId: string) {
    const nextValue =
      constraintType === "min-value" || constraintType === "max-value"
        ? Number(constraintValue) || 0
        : null;

    onAddConstraint(exercise.id, variableId, constraintType, nextValue);
    setActiveConstraintVariableId(null);
    setConstraintType("min-value");
    setConstraintValue("5");
  }

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
        <AccordionCardItem className="border-b-0" value={exercise.id}>
          <AccordionCardHeader
            aside={
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
                <div
                  className="flex flex-wrap items-center gap-2"
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
                    className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
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
                  <button
                    aria-label="Tags are configured in the course root"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-200 text-[11px] font-semibold text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    title="Tags can be configured in the course root."
                    type="button"
                  >
                    ?
                  </button>
                </div>
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
            }
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Exercise actions"
                    className="h-8 w-8"
                    size="icon"
                    variant="ghost"
                  >
                    <Ellipsis aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    className={canMoveUp ? undefined : "pointer-events-none text-stone-400"}
                    onSelect={() => {
                      if (canMoveUp) {
                        onMoveUp(exercise.id);
                      }
                    }}
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={canMoveDown ? undefined : "pointer-events-none text-stone-400"}
                    onSelect={() => {
                      if (canMoveDown) {
                        onMoveDown(exercise.id);
                      }
                    }}
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onSelect={() => onDelete(exercise.id)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
            bodyClassName="flex min-w-0 flex-col gap-2"
            value={exercise.id}
          >
            <Eyebrow size="small">Exercise</Eyebrow>
          </AccordionCardHeader>
          {collapsed && (
            <div className="px-10 pb-4">
              <p className="truncate text-sm leading-6 text-stone-600">
                {promptPreview}
              </p>
            </div>
          )}
          <AccordionCardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Eyebrow size="small">prompt</Eyebrow>
                <Textarea
                  className="min-h-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-base font-medium text-stone-700 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
                  onChange={(event) => onPromptChange(exercise, locale, event.target.value)}
                  placeholder="Mary had {{ apple_number }} apples..."
                  ref={promptRef}
                  rows={2}
                  value={prompt}
                />
              </div>

              {exercise.variables.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Eyebrow size="small">Variables</Eyebrow>
                  {exercise.variables.map((variable) => {
                    const isUsed = usedVariableNames.has(variable.name);

                    return (
                      <div className="flex flex-col gap-2" key={variable.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isUsed ? "variable" : "draft"}>
                            <span>{variable.name}</span>
                            {!isUsed && (
                              <>
                                <span
                                  className="inline-flex items-center"
                                  title="variable not used in prompt"
                                >
                                  <TriangleAlert
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                </span>
                                <button
                                  aria-label={`Remove variable ${variable.name}`}
                                  className="inline-flex items-center"
                                  onClick={() => onVariableRemove(exercise.id, variable.id)}
                                  type="button"
                                >
                                  <X aria-hidden="true" className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </Badge>
                          {variable.constraints.map((constraint) => (
                            <Badge
                              className="gap-1.5 pr-1"
                              key={constraint.id}
                              variant="secondary"
                            >
                              <span>{getConstraintLabel(constraint)}</span>
                              <button
                                aria-label={`Remove ${getConstraintLabel(constraint)}`}
                                className="inline-flex items-center"
                                onClick={() =>
                                  onRemoveConstraint(
                                    exercise.id,
                                    variable.id,
                                    constraint.id,
                                  )
                                }
                                type="button"
                              >
                                <X aria-hidden="true" className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Button
                            onClick={() =>
                              setActiveConstraintVariableId((currentId) =>
                                currentId === variable.id ? null : variable.id,
                              )
                            }
                            size="sm"
                            variant="ghost"
                          >
                            <Plus aria-hidden="true" className="h-4 w-4" />
                            New constraint
                          </Button>
                        </div>

                        {activeConstraintVariableId === variable.id && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              onValueChange={(value) =>
                                setConstraintType(value as VariableConstraintType)
                              }
                              value={constraintType}
                            >
                              <SelectTrigger className="w-full sm:w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="min-value">min-value</SelectItem>
                                <SelectItem value="max-value">max-value</SelectItem>
                                <SelectItem value="even-number">even-number</SelectItem>
                                <SelectItem value="odd-number">odd-number</SelectItem>
                              </SelectContent>
                            </Select>
                            {(constraintType === "min-value" ||
                              constraintType === "max-value") && (
                              <Input
                                className="w-full sm:w-32"
                                onChange={(event) => setConstraintValue(event.target.value)}
                                type="number"
                                value={constraintValue}
                              />
                            )}
                            <Button
                              onClick={() => submitConstraint(variable.id)}
                              size="sm"
                              variant="secondary"
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Eyebrow size="small">Solution</Eyebrow>
                <Textarea
                  className="min-h-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-base font-medium text-stone-700 shadow-none placeholder:text-stone-400 focus-visible:ring-0"
                  onChange={(event) => onSolutionChange(exercise.id, event.target.value)}
                  placeholder="apple_number + 42"
                  ref={solutionRef}
                  rows={2}
                  value={exercise.solution}
                />
                {solutionValidation.status !== "idle" && (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          solutionValidation.status === "valid" ? "success" : "draft"
                        }
                      >
                        {getValidationLabel(solutionValidation.status)}
                      </Badge>
                      <CardDescription>{solutionValidation.message}</CardDescription>
                    </div>
                    {solutionValidation.sampleVariables && (
                      <CardDescription>
                        Variables: {formatSampleVariables(solutionValidation.sampleVariables)}
                      </CardDescription>
                    )}
                  </div>
                )}
              </div>
            </div>
          </AccordionCardContent>
        </AccordionCardItem>
      </Accordion>
    </div>
  );
}
