import { Fragment, useEffect, useRef, useState } from "react";
import { Check, Play, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExercisePromptCard } from "@/components/test-editor-prototype-exercise-card";
import { TestPreviewPlayer } from "@/components/test-editor-prototype-preview";
import { PageActions } from "@/components/page-actions";
import { PageContent } from "@/components/page-content";
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
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  initialState?: TestEditorState;
  initialTitle: string;
  onStateChange?: (state: TestEditorState) => void;
  supportedLocales: Locale[];
};

export function TestEditorPrototype({
  courseId,
  descriptiveTags,
  initialState,
  initialTitle,
  onStateChange,
  supportedLocales,
}: TestEditorPrototypeProps) {
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [draftExerciseKind, setDraftExerciseKind] = useState<ExerciseKind>("numeric");
  const [draftExercise, setDraftExercise] = useState<TestExercise | null>(null);
  const [state, setState] = useState<TestEditorState>(() =>
    initialState ?? createInitialState(supportedLocales, initialTitle),
  );
  const hasInitializedExternalStateRef = useRef(false);

  useEffect(() => {
    if (!initialState || hasInitializedExternalStateRef.current) {
      return;
    }

    // Opening an existing test starts with every exercise collapsed — with
    // several exercises already authored, an all-expanded accordion is a
    // wall of content before the teacher has chosen what to look at.
    setCollapsedExerciseIds(initialState.exercises.map((exercise) => exercise.id));
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
    if (descriptiveTags.length === 0) {
      return;
    }

    setState((currentState) => {
      if (currentState.blueprint.length > 0) {
        return currentState;
      }

      return {
        ...currentState,
        blueprint: descriptiveTags.map((tag) => ({
          count: 1,
          id: `rule_${Math.random().toString(36).slice(2, 8)}`,
          tagId: tag.id,
        })),
      };
    });
  }, [descriptiveTags]);

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

  function startAddExercise() {
    setIsAddingExercise(true);
    setDraftExerciseKind("numeric");
    setDraftExercise(null);
  }

  function selectDraftExerciseKind() {
    setDraftExercise(getExerciseKindEditor(draftExerciseKind).createExercise(supportedLocales));
  }

  function cancelAddExercise() {
    setIsAddingExercise(false);
    setDraftExercise(null);
  }

  function commitDraftExercise() {
    if (!draftExercise) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      activeExerciseId: draftExercise.id,
      exercises: [...currentState.exercises, draftExercise],
    }));
    // The exercise just moved from the draft form into the accordion list
    // alongside every other already-authored exercise — it should land there
    // collapsed like its siblings, not stay expanded just because it's new.
    setCollapsedExerciseIds((currentIds) => [...currentIds, draftExercise.id]);
    setIsAddingExercise(false);
    setDraftExercise(null);
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

  const hasExercises = state.exercises.length > 0;
  const DraftFieldsComponent = draftExercise
    ? getExerciseKindEditor(draftExercise.kind).FieldsComponent
    : null;

  const testActionButtons = (
    <>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            disabled={!hasExercises}
            onClick={() => setIsPreviewOpen(true)}
            variant="secondary"
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            Preview test
          </Button>
        </TooltipTrigger>
        {!hasExercises && (
          <TooltipContent>
            Add at least one exercise to preview this test
          </TooltipContent>
        )}
      </Tooltip>
    </>
  );

  return (
    <PageContent actions={<PageActions>{testActionButtons}</PageActions>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Eyebrow>Test</Eyebrow>
            <Input
              className="text-2xl font-semibold tracking-tight md:text-3xl"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled test"
              value={state.title}
              variant="ghost"
            />
            <Textarea
              className="min-h-0 resize-none overflow-hidden text-base font-medium text-muted-foreground md:text-base"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="No description"
              ref={descriptionRef}
              rows={1}
              value={state.description}
              variant="ghost"
            />
          </div>
          <PageActions className="hidden lg:flex">
            {testActionButtons}
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
            <div className="flex items-center gap-2">
              <AccordionTrigger className="flex-none">
                Exercise randomization
              </AccordionTrigger>
              {state.useBlueprint && (
                <Badge variant="success">
                  <Check aria-hidden="true" className="h-3 w-3" />
                  On
                </Badge>
              )}
            </div>
            <AccordionContent>
              <div className="flex flex-col gap-4">
                <CardDescription>
                  Exercise randomization selects a random part of the
                  exercises to show the student, based on the tags of the
                  exercises.
                </CardDescription>

                <div className="flex items-center gap-2">
                  <Label>
                    <Checkbox
                      checked={state.useBlueprint}
                      onCheckedChange={toggleBlueprintUsage}
                    />
                    Enable exercise randomization
                  </Label>
                  <InfoTooltip>
                    Exercises are going to be randomly selected based on the
                    rules defined below. Rules are defined using course tags
                    which can be added on the course root page.
                  </InfoTooltip>
                </div>

                <div className="flex flex-col gap-3">
                  {state.blueprint.map((rule) => {
                    const available = countMatchingExercises(
                      state.exercises,
                      rule.tagId,
                    );
                    const isInvalid = available < rule.count;

                    return (
                      <div key={rule.id}>
                        <div className="flex items-center gap-2">
                          <Select
                            disabled={!state.useBlueprint}
                            onValueChange={(value) =>
                              updateBlueprintRule(rule.id, {
                                tagId: value ?? "",
                              })
                            }
                            value={rule.tagId ?? undefined}
                          >
                            <SelectTrigger className="w-56">
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
                            className="w-20"
                            disabled={!state.useBlueprint}
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
                        </div>
                        {state.useBlueprint && rule.tagId && isInvalid && (
                          <CardDescription className="text-warning">
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
                      disabled={!state.useBlueprint}
                      onClick={addBlueprintRule}
                      size="sm"
                      variant="secondary"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      Add more tagged exercises
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        <Tabs
          className="flex flex-col gap-4"
          onValueChange={(value) =>
            setState((currentState) => ({
              ...currentState,
              selectedLocale: value as Locale,
            }))
          }
          value={state.selectedLocale}
        >
          {supportedLocales.length > 1 && (
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
          )}

          {supportedLocales.map((locale) => (
            <TabsContent className="flex flex-col gap-4" key={locale} value={locale}>
              {state.exercises.map((exercise, index) => (
                <Fragment key={exercise.id}>
                  {index > 0 && <Separator />}
                  <ExercisePromptCard
                    canMoveDown={index < state.exercises.length - 1}
                    canMoveUp={index > 0}
                    collapsed={collapsedExerciseIds.includes(exercise.id)}
                    courseId={courseId}
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
                    orderLabel={state.useBlueprint ? "–" : String(index + 1)}
                  />
                </Fragment>
              ))}

              {!isAddingExercise ? (
                <Button
                  className="gap-2 self-start"
                  onClick={startAddExercise}
                  variant="default"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add exercise
                </Button>
              ) : (
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    {!draftExercise ? (
                      <>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="draft-exercise-kind">Exercise type</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              onValueChange={(value) => {
                                if (value) {
                                  setDraftExerciseKind(value as ExerciseKind);
                                }
                              }}
                              value={draftExerciseKind}
                            >
                              <SelectTrigger className="w-full sm:w-56" id="draft-exercise-kind">
                                <SelectValue>
                                  {getExerciseKindEditor(draftExerciseKind).label}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {listExerciseKindEditors().map((editor) => (
                                  <SelectItem key={editor.kind} value={editor.kind}>
                                    {editor.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={selectDraftExerciseKind} size="sm">
                              Confirm
                            </Button>
                            <Button onClick={cancelAddExercise} size="sm" variant="ghost">
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-foreground">
                            {getExerciseKindEditor(draftExerciseKind).label} exercise type
                          </p>
                          <CardDescription>
                            {getExerciseKindEditor(draftExerciseKind).description}
                          </CardDescription>
                        </div>
                        {(() => {
                          const { ExampleComponent } =
                            getExerciseKindEditor(draftExerciseKind);

                          return (
                            ExampleComponent && (
                              <div className="flex flex-col gap-2">
                                <Eyebrow size="small">Example</Eyebrow>
                                <ExampleComponent />
                              </div>
                            )
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        {DraftFieldsComponent && (
                          <DraftFieldsComponent
                            courseId={courseId}
                            exercise={draftExercise}
                            locale={locale}
                            onChange={(updater) =>
                              setDraftExercise((currentDraft) =>
                                currentDraft ? updater(currentDraft) : currentDraft,
                              )
                            }
                          />
                        )}
                        {(() => {
                          const isMissingPrompt = !(
                            draftExercise.locales[locale]?.prompt ?? ""
                          ).trim();
                          const isMissingSolution =
                            draftExercise.kind === "numeric" &&
                            !draftExercise.solution.trim();
                          const isDraftIncomplete = isMissingPrompt || isMissingSolution;

                          return (
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger render={<span className="inline-flex" />}>
                                  <Button
                                    disabled={isDraftIncomplete}
                                    onClick={commitDraftExercise}
                                    size="sm"
                                  >
                                    Save exercise
                                  </Button>
                                </TooltipTrigger>
                                {isDraftIncomplete && (
                                  <TooltipContent>
                                    {isMissingPrompt && isMissingSolution
                                      ? "Add a prompt and solution before saving this exercise"
                                      : isMissingPrompt
                                        ? "Add a prompt before saving this exercise"
                                        : "Add a solution before saving this exercise"}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <Button onClick={cancelAddExercise} size="sm" variant="ghost">
                                Cancel
                              </Button>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <TestPreviewPlayer
        courseId={courseId}
        onClose={() => setIsPreviewOpen(false)}
        open={isPreviewOpen}
        supportedLocales={supportedLocales}
        testState={state}
      />
    </PageContent>
  );
}
