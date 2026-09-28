import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Check, Play, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
import { Field, FieldLabel } from "@/components/ui/field";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExercisePromptCard } from "@/components/test-editor-prototype-exercise-card";
import { PageContent } from "@/components/page-content";
import {
  getExerciseKindEditor,
  listExerciseKindEditors,
} from "@/components/exercise-kinds/registry";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import {
  countMatchingExercises,
  toggleExerciseTag,
} from "@/components/test-editor-prototype-logic";
import type {
  BlueprintRule,
  CourseTagDefinition,
  TestEditorState,
  TestExercise,
} from "@/components/test-editor-prototype-types";
import type { ExerciseKind } from "@/lib/course-package";
import { buildDraftTestPreviewPath } from "@/lib/course-utils";
import type { Locale } from "@/lib/i18n";
import { getLocaleFlag } from "@/lib/locale-flags";

type TestEditorPrototypeProps = {
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  // Always provided by the single current caller (draft-test-editor.tsx),
  // which owns the persisted state and only ever mounts this component once
  // its own query has resolved — so this never arrives late, and there's no
  // separate "uncontrolled" mode to support.
  initialState: TestEditorState;
  // A lesson-attached test has no title/description of its own at all —
  // its file is pure exercise content, no identity fields (see
  // `updateLocalCourseLessonTest`). Only a standalone test's own
  // title/description block (rendered by the caller, above this component)
  // and this component's own description field are shown when true.
  isStandalone: boolean;
  onStateChange: (state: TestEditorState) => void;
  // A standalone test's own per-locale title editor (rendered by the
  // caller, since it owns that mutation/autosave) — shown as the first
  // regular field, above Description. Absent for a lesson-attached test.
  titleEditor?: ReactNode;
  // The tree node currently selected in the draft explorer — forwarded to
  // the preview route so closing it can land back on this same test instead
  // of resetting to the course root (see `CourseLayout`'s `selectedNode`
  // initializer, which reads it back from `location.state`).
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
};

export function TestEditorPrototype({
  courseId,
  descriptiveTags,
  initialState,
  isStandalone,
  onStateChange,
  selectedNode,
  supportedLocales,
  titleEditor,
}: TestEditorPrototypeProps) {
  const navigate = useNavigate();
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [draftExerciseKind, setDraftExerciseKind] =
    useState<ExerciseKind>("numeric");
  const [draftExercise, setDraftExercise] = useState<TestExercise | null>(null);
  // Which accordion sections are expanded is pure UI state, not test
  // content — it must not live in `TestEditorState`. That state is only
  // ever saved/reloaded through `SharedTestDefinition`, which has no field
  // for it, so persisting it there was a dead write: the moment any real
  // edit's autosave landed and invalidated this test's query, `DraftTestEditor`
  // unmounted this whole subtree while refetching and remounted it with the
  // accordion state re-seeded to `[]`, silently closing it right after a
  // teacher opened it — the same "invalidate → unmount → remount → lose
  // unpersisted state" shape as the blueprint and title bugs fixed earlier.
  const [selectedAdvancedSections, setSelectedAdvancedSections] = useState<
    string[]
  >([]);
  // `initialState` is only ever read here, at mount — the single caller
  // (draft-test-editor.tsx) owns the persisted value and re-mounts this
  // component (via a fresh `key`, through its own loading-state gate)
  // whenever it has a genuinely different one to seed from, rather than
  // this component watching for it to change under it.
  const [state, setState] = useState<TestEditorState>(initialState);

  // A teacher fills in a randomization rule per tag themselves (see
  // `addBlueprintRule`) — this used to auto-populate one per descriptive tag
  // the moment any existed, whether or not randomization was ever turned on.
  // That caused a real infinite loop: `toSharedTestDefinition` only persists
  // `blueprint` when `useBlueprint` is true, so the auto-populated blueprint
  // was invisible to the save it triggered; the entity still looked dirty to
  // `useEntityAutosave`, which saved (rewriting equivalent content),
  // invalidated this test's own query, and — because `DraftTestEditor`
  // unmounts this whole subtree while its query is refetching — remounted
  // this component from scratch with the blueprint empty again, repeating
  // forever.

  useEffect(() => {
    onStateChange(state);
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

  function setDescription(description: string) {
    setState((currentState) => ({
      ...currentState,
      description,
    }));
  }

  function updateBlueprintRule(
    ruleId: string,
    nextRule: Partial<BlueprintRule>,
  ) {
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

  function toggleStrictAdvancement() {
    setState((currentState) => ({
      ...currentState,
      strictAdvancement: !currentState.strictAdvancement,
    }));
  }

  function startAddExercise() {
    setIsAddingExercise(true);
    setDraftExerciseKind("numeric");
    setDraftExercise(null);
  }

  function selectDraftExerciseKind() {
    setDraftExercise(
      getExerciseKindEditor(draftExerciseKind).createExercise(supportedLocales),
    );
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
    setIsAddingExercise(false);
    setDraftExercise(null);
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
    setState((currentState) => ({
      ...currentState,
      exercises: currentState.exercises.filter(
        (exercise) => exercise.id !== exerciseId,
      ),
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
            onClick={() =>
              navigate(buildDraftTestPreviewPath(courseId), {
                state: { selectedNode, supportedLocales, testState: state },
              })
            }
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
    <PageContent actions={testActionButtons}>
      <div className="flex flex-col gap-4">
        {titleEditor}

        {isStandalone && (
          <Field>
            <FieldLabel htmlFor="test-description">Description</FieldLabel>
            <Textarea
              className="min-h-0 resize-none overflow-hidden"
              id="test-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a short test description"
              rows={1}
              value={state.description}
            />
          </Field>
        )}

        <Accordion
          multiple
          onValueChange={(value) =>
            setSelectedAdvancedSections(value as string[])
          }
          value={selectedAdvancedSections}
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
                  Exercise randomization selects a random part of the exercises
                  to show the student, based on the tags of the exercises.
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
                            {descriptiveTags.find(
                              (tag) => tag.id === rule.tagId,
                            )?.label ?? rule.tagId}
                            ", but only {available}{" "}
                            {available === 1 ? "is" : "are"} available.
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

        <div className="flex items-center gap-2">
          <Label>
            <Checkbox
              checked={state.strictAdvancement}
              onCheckedChange={toggleStrictAdvancement}
            />
            Require a correct answer before moving on in interactive mode
          </Label>
          <InfoTooltip>
            When on, a student must answer each exercise correctly before
            interactive mode lets them move to the next one. When off, they can
            move on regardless and come back to fix answers later.
          </InfoTooltip>
        </div>

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
            <TabsContent
              className="flex flex-col gap-4"
              key={locale}
              value={locale}
            >
              {state.exercises.map((exercise, index) => (
                <Fragment key={exercise.id}>
                  {index > 0 && <Separator />}
                  <ExercisePromptCard
                    canMoveDown={index < state.exercises.length - 1}
                    canMoveUp={index > 0}
                    courseId={courseId}
                    descriptiveTags={descriptiveTags}
                    exercise={exercise}
                    locale={locale}
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
                          <Label htmlFor="draft-exercise-kind">
                            Exercise type
                          </Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              onValueChange={(value) => {
                                if (value) {
                                  setDraftExerciseKind(value as ExerciseKind);
                                }
                              }}
                              value={draftExerciseKind}
                            >
                              <SelectTrigger
                                className="w-full sm:w-56"
                                id="draft-exercise-kind"
                              >
                                <SelectValue>
                                  {
                                    getExerciseKindEditor(draftExerciseKind)
                                      .label
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {listExerciseKindEditors().map((editor) => (
                                  <SelectItem
                                    key={editor.kind}
                                    value={editor.kind}
                                  >
                                    {editor.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={selectDraftExerciseKind} size="sm">
                              Confirm
                            </Button>
                            <Button
                              onClick={cancelAddExercise}
                              size="sm"
                              variant="ghost"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-foreground">
                            {getExerciseKindEditor(draftExerciseKind).label}
                          </p>
                          <CardDescription>
                            {
                              getExerciseKindEditor(draftExerciseKind)
                                .description
                            }
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
                                currentDraft
                                  ? updater(currentDraft)
                                  : currentDraft,
                              )
                            }
                          />
                        )}
                        {(() => {
                          const isMissingPrompt = !(
                            draftExercise.locales[locale]?.prompt ?? ""
                          ).trim();
                          const validation = getExerciseKindEditor(
                            draftExercise.kind,
                          ).validate(draftExercise, locale);
                          const isInvalid = validation.status === "error";
                          const validationMessage =
                            validation.status === "idle"
                              ? null
                              : validation.message;
                          const isDraftIncomplete =
                            isMissingPrompt || isInvalid;

                          return (
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger
                                  render={<span className="inline-flex" />}
                                >
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
                                    {isMissingPrompt && isInvalid
                                      ? `Add a prompt before saving this exercise. ${validationMessage}`
                                      : isMissingPrompt
                                        ? "Add a prompt before saving this exercise"
                                        : validationMessage}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <Button
                                onClick={cancelAddExercise}
                                size="sm"
                                variant="ghost"
                              >
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
    </PageContent>
  );
}
