import { useEffect, useRef, useState } from "react";
import { FlaskConical, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ExercisePromptCard } from "@/components/test-editor-prototype-exercise-card";
import { PageActions } from "@/components/page-actions";
import { getExerciseKindEditor, listExerciseKindEditors } from "@/components/exercise-kinds/registry";
import {
  countMatchingExercises,
  createInitialState,
  toggleExerciseTag,
} from "@/components/test-editor-prototype-logic";
import type {
  BlueprintRule,
  CourseTagDefinition,
  TestEditorState,
  TestExercise,
} from "@/components/test-editor-prototype-types";
import type { ExerciseKind } from "@/lib/course-package";
import type { Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";

type TestEditorPrototypeProps = {
  descriptiveTags: CourseTagDefinition[];
  initialState?: TestEditorState;
  initialTitle: string;
  onStateChange?: (state: TestEditorState) => void;
  supportedLocales: Locale[];
};

export function TestEditorPrototype({
  descriptiveTags,
  initialState,
  initialTitle,
  onStateChange,
  supportedLocales,
}: TestEditorPrototypeProps) {
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<string[]>([]);
  const [state, setState] = useState<TestEditorState>(() =>
    initialState ?? createInitialState(supportedLocales, initialTitle),
  );
  const hasInitializedExternalStateRef = useRef(false);

  useEffect(() => {
    if (!initialState || hasInitializedExternalStateRef.current) {
      return;
    }

    setCollapsedExerciseIds([]);
    setState(initialState);
    hasInitializedExternalStateRef.current = true;
  }, [initialState]);

  useEffect(() => {
    if (initialState) {
      return;
    }

    const nextState = createInitialState(supportedLocales, initialTitle);
    const firstExerciseId = nextState.exercises[0]?.id ?? "";
    setCollapsedExerciseIds([]);
    setState({
      ...nextState,
      activeExerciseId: firstExerciseId,
    });
  }, [initialState, initialTitle, supportedLocales]);

  useEffect(() => {
    if (state.activeExerciseId) {
      return;
    }

    const firstExerciseId = state.exercises[0]?.id ?? "";

    if (firstExerciseId) {
      setState((currentState) => ({
        ...currentState,
        activeExerciseId: firstExerciseId,
      }));
    }
  }, [state.activeExerciseId, state.exercises]);

  useEffect(() => {
    const textarea = descriptionRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [state.description]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  function updateExercise(
    exerciseId: string,
    updater: (exercise: TestExercise) => TestExercise,
  ) {
    setState((currentState) => ({
      ...currentState,
      exercises: currentState.exercises.map((exercise) =>
        exercise.id === exerciseId ? updater(exercise) : exercise,
      ),
    }));
  }

  function setTitle(title: string) {
    setState((currentState) => ({
      ...currentState,
      title,
    }));
  }

  function setDescription(description: string) {
    setState((currentState) => ({
      ...currentState,
      description,
    }));
  }

  function updateBlueprintRule(ruleId: string, nextRule: Partial<BlueprintRule>) {
    setState((currentState) => ({
      ...currentState,
      blueprint: currentState.blueprint.map((rule) =>
        rule.id === ruleId ? { ...rule, ...nextRule } : rule,
      ),
    }));
  }

  function addBlueprintRule() {
    const fallbackTagId = descriptiveTags[0]?.id ?? "";

    setState((currentState) => ({
      ...currentState,
      blueprint: [
        ...currentState.blueprint,
        {
          count: 1,
          id: `rule_${Math.random().toString(36).slice(2, 8)}`,
          tagId: fallbackTagId,
        },
      ],
    }));
  }

  function toggleBlueprintUsage() {
    setState((currentState) => ({
      ...currentState,
      useBlueprint: !currentState.useBlueprint,
    }));
  }

  function addExercise(kind: ExerciseKind) {
    const nextExercise = getExerciseKindEditor(kind).createExercise(supportedLocales);

    setState((currentState) => ({
      ...currentState,
      activeExerciseId: nextExercise.id,
      exercises: [...currentState.exercises, nextExercise],
    }));
  }

  function setExerciseCollapsed(exerciseId: string, collapsed: boolean) {
    setCollapsedExerciseIds((currentIds) => {
      const isCurrentlyCollapsed = currentIds.includes(exerciseId);

      if (isCurrentlyCollapsed === collapsed) {
        return currentIds;
      }

      return collapsed
        ? [...currentIds, exerciseId]
        : currentIds.filter((id) => id !== exerciseId);
    });
  }

  function moveExercise(exerciseId: string, direction: -1 | 1) {
    setState((currentState) => {
      const currentIndex = currentState.exercises.findIndex(
        (exercise) => exercise.id === exerciseId,
      );
      const nextIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentState.exercises.length
      ) {
        return currentState;
      }

      const nextExercises = [...currentState.exercises];
      const [movedExercise] = nextExercises.splice(currentIndex, 1);
      nextExercises.splice(nextIndex, 0, movedExercise);

      return {
        ...currentState,
        exercises: nextExercises,
      };
    });
  }

  function removeExercise(exerciseId: string) {
    setCollapsedExerciseIds((currentIds) =>
      currentIds.filter((id) => id !== exerciseId),
    );
    setState((currentState) => ({
      ...currentState,
      exercises: currentState.exercises.filter((exercise) => exercise.id !== exerciseId),
    }));
  }

  return (
    <div className="h-full p-4 sm:p-5 lg:p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Eyebrow>Test</Eyebrow>
              <Input
                className="h-auto border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-stone-950 shadow-none placeholder:text-stone-300 focus-visible:ring-0 md:text-3xl"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled test"
                value={state.title}
              />
              <Textarea
                className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-base font-medium text-stone-600 shadow-none placeholder:text-stone-400 focus-visible:ring-0 md:text-base"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a short description"
                ref={descriptionRef}
                rows={1}
                value={state.description}
              />
            </div>
            <PageActions>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button className="gap-2" />}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add exercise
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {listExerciseKindEditors().map((editor) => (
                    <DropdownMenuItem key={editor.kind} onClick={() => addExercise(editor.kind)}>
                      {editor.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PageActions>
          </div>

          <Accordion
            multiple
            onValueChange={(value) =>
              setState((currentState) => ({
                ...currentState,
                selectedAdvancedSections: value as string[],
              }))
            }
            value={state.selectedAdvancedSections}
          >
            <AccordionItem value="advanced">
              <AccordionTrigger>Advanced</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4">
                  <CardDescription>
                    By default, the test includes every exercise in the order shown in
                    the exercise bank.
                  </CardDescription>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">
                      {state.useBlueprint
                        ? "Using test structure"
                        : "All exercises in order"}
                    </Badge>
                    <Button
                      onClick={toggleBlueprintUsage}
                      size="sm"
                      variant={state.useBlueprint ? "secondary" : "ghost"}
                    >
                      {state.useBlueprint
                        ? "Disable test structure"
                        : "Enable test structure"}
                    </Button>
                  </div>

                  {state.useBlueprint && (
                    <div className="grid gap-3">
                      {state.blueprint.map((rule) => {
                        const available = countMatchingExercises(
                          state.exercises,
                          rule.tagId,
                        );
                        const isInvalid = available < rule.count;

                        return (
                          <div
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"
                            key={rule.id}
                          >
                            <Select
                              onValueChange={(value) =>
                                updateBlueprintRule(rule.id, {
                                  tagId: value ?? "",
                                })
                              }
                              value={rule.tagId ?? undefined}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select tag" />
                              </SelectTrigger>
                              <SelectContent>
                                {descriptiveTags.map((tag) => (
                                  <SelectItem key={tag.id} value={tag.id}>
                                    {tag.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              min={1}
                              onChange={(event) =>
                                updateBlueprintRule(rule.id, {
                                  count: Math.max(
                                    1,
                                    Number(event.target.value) || 1,
                                  ),
                                })
                              }
                              type="number"
                              value={rule.count}
                            />
                            {rule.tagId && isInvalid && (
                              <CardDescription className="sm:col-span-2 text-amber-700">
                                Need {rule.count} exercises tagged "
                                {descriptiveTags.find((tag) => tag.id === rule.tagId)?.label ??
                                  rule.tagId}
                                ", but
                                only {available} {available === 1 ? "is" : "are"}{" "}
                                available.
                              </CardDescription>
                            )}
                          </div>
                        );
                      })}

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={addBlueprintRule}
                          size="sm"
                          variant="secondary"
                        >
                          <Plus aria-hidden="true" className="h-4 w-4" />
                          Add rule
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{state.exercises.length} items</Badge>
          </div>

          <Tabs
            onValueChange={(value) =>
              setState((currentState) => ({
                ...currentState,
                selectedLocale: value as Locale,
              }))
            }
            value={state.selectedLocale}
          >
            <TabsList>
              {supportedLocales.map((locale) => (
                <TabsTrigger key={locale} value={locale}>
                  <span className="text-base leading-none">
                    {getLocaleFlag(locale)}
                  </span>
                  <span>{locale}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {supportedLocales.map((locale) => (
              <TabsContent className="flex flex-col gap-4" key={locale} value={locale}>
                <CardDescription>
                  {state.useBlueprint
                    ? "Structure rules are enabled in Advanced."
                    : "Exercises will be used in this order."}
                </CardDescription>

                {state.exercises.length > 0 ? (
                  <div className="flex flex-col">
                    {state.exercises.map((exercise, index) => (
                      <div
                        className={index === 0 ? "" : "border-t border-stone-200 pt-4"}
                        key={exercise.id}
                      >
                        <ExercisePromptCard
                          canMoveDown={index < state.exercises.length - 1}
                          canMoveUp={index > 0}
                          collapsed={collapsedExerciseIds.includes(exercise.id)}
                          descriptiveTags={descriptiveTags}
                          exercise={exercise}
                          locale={locale}
                          onCollapsedChange={setExerciseCollapsed}
                          onDelete={removeExercise}
                          onExerciseChange={updateExercise}
                          onMoveDown={(exerciseId) => moveExercise(exerciseId, 1)}
                          onMoveUp={(exerciseId) => moveExercise(exerciseId, -1)}
                          onToggleTag={(exerciseId, tagId) =>
                            updateExercise(exerciseId, (currentExercise) =>
                              toggleExerciseTag(currentExercise, tagId),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-8 text-stone-500">
                    <FlaskConical aria-hidden="true" className="h-5 w-5 shrink-0" />
                    <CardDescription>
                      Add the first exercise to start defining the test.
                    </CardDescription>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button className="gap-2 self-start" variant="default" />}
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add exercise
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {listExerciseKindEditors().map((editor) => (
                      <DropdownMenuItem key={editor.kind} onClick={() => addExercise(editor.kind)}>
                        {editor.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
