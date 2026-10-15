import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Play, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { LocaleTabsList } from "@/components/locales-tabs";
import { StickyBar } from "@/components/ui/sticky-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExerciseMediaField } from "@/components/exercise-media-field";
import { ExercisePromptCard } from "@/components/test-editor-prototype-exercise-card";
import { TestMoreOptions } from "@/components/test-more-options";
import { TestTypeField } from "@/components/test-type-field";
import { GeneratedLocaleNotice } from "@/components/generated-locale-notice";
import { PageContent } from "@/components/page-content";
import {
  getExerciseKindEditor,
  listExerciseKindEditors,
} from "@/components/exercise-kinds/registry";
import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import { hasTestMoreOptionsSet, toggleExerciseTag } from "@/components/test-editor-prototype-logic";
import type {
  CourseTagDefinition,
  TestEditorState,
  TestExercise,
} from "@/components/test-editor-prototype-types";
import type { CourseTest, ExerciseKind } from "@/lib/course-package";
import type { GradeBand } from "@/lib/grade-bands";
import { buildDraftTestPreviewPath } from "@/lib/course-utils";
import type { Locale } from "@/lib/i18n";
import {
  isGeneratedLocale,
  useGeneratedSerbianLocale,
} from "@/lib/use-serbian-script";

type TestEditorPrototypeProps = {
  // Where a graded test's own bands start from (SLJ-135); null: the defaults.
  courseGradeBands: GradeBand[] | null;
  // Every test in the course, as saved: a final test's pool (SLJ-136).
  courseTests: CourseTest[];
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
  // A standalone test's title field for one locale (rendered by the caller,
  // since it owns that mutation/autosave) — shown as the first regular
  // field, above Description, for the locale picked in the page's single
  // language tab bar. Absent for a lesson-attached test.
  renderTitle?: (locale: Locale) => ReactNode;
  // Marks a language tab as incomplete (e.g. a missing title).
  getIsLocaleIncomplete?: (locale: Locale) => boolean;
  // The tree node currently selected in the draft explorer — forwarded to
  // the preview route so closing it can land back on this same test instead
  // of resetting to the course root (see `CourseLayout`'s `selectedNode`
  // initializer, which reads it back from `location.state`).
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
};

export function TestEditorPrototype({
  courseGradeBands,
  courseTests,
  courseId,
  descriptiveTags,
  initialState,
  isStandalone,
  onStateChange,
  selectedNode,
  supportedLocales,
  renderTitle,
  getIsLocaleIncomplete,
}: TestEditorPrototypeProps) {
  const navigate = useNavigate();
  const generatedLocale = useGeneratedSerbianLocale();
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [draftExerciseKind, setDraftExerciseKind] =
    useState<ExerciseKind>("numeric");
  const [draftExercise, setDraftExercise] = useState<TestExercise | null>(null);
  // `initialState` is only ever read here, at mount — the single caller
  // (draft-test-editor.tsx) owns the persisted value and re-mounts this
  // component (via a fresh `key`, through its own loading-state gate)
  // whenever it has a genuinely different one to seed from, rather than
  // this component watching for it to change under it.
  const [state, setState] = useState<TestEditorState>(initialState);
  // Whether "Show more options" is open is UI state, not test content: it
  // must not live in `TestEditorState`, which is only saved through
  // `SharedTestDefinition` (a dead write there once closed sections right
  // after a save). It starts open when something in it is set.
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(() => hasTestMoreOptionsSet(initialState));

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
      {/* One language tab bar for the whole page, kept in view while
          scrolling: it picks the title's locale and the exercises' locale
          together. The fields in between (description, randomization,
          strictness) aren't per-language. */}
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
          <StickyBar>
            <LocaleTabsList
              getIsIncomplete={(locale) =>
                Boolean(getIsLocaleIncomplete?.(locale)) ||
                // An exercise without a prompt in a written language (the
                // generated Serbian script follows its source).
                (!(generatedLocale && isGeneratedLocale(generatedLocale, locale)) &&
                  state.exercises.some((exercise) => !exercise.locales[locale]?.prompt?.trim()))
              }
              locales={supportedLocales}
            />
          </StickyBar>
        )}

        {generatedLocale &&
        isGeneratedLocale(generatedLocale, state.selectedLocale) ? (
          <GeneratedLocaleNotice
            onEditSource={() =>
              setState((currentState) => ({
                ...currentState,
                selectedLocale: generatedLocale.source,
              }))
            }
            source={generatedLocale.source}
          />
        ) : (
          renderTitle?.(state.selectedLocale)
        )}

        {/* A standalone test's description is per language, with its title
            (`renderTitle`): the one students see. */}
        <TestTypeField
          graded={state.graded}
          onGradedChange={(graded) => setState((currentState) => ({ ...currentState, graded }))}
        />

        <TestMoreOptions
          courseGradeBands={courseGradeBands}
          courseTests={courseTests}
          descriptiveTags={descriptiveTags}
          isStandalone={isStandalone}
          onOpenChange={setIsMoreOptionsOpen}
          open={isMoreOptionsOpen}
          state={state}
          testId={selectedNode.id}
          updateState={setState}
        />

        <Separator />

        {/* A generated Serbian script has no fields of its own: the notice
              above stands in for it. */}
        {supportedLocales
          .filter((locale) => !isGeneratedLocale(generatedLocale, locale))
          .map((locale) => (
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
                            moreOptions={
                              <ExerciseMediaField
                                courseId={courseId}
                                exercise={draftExercise}
                                locale={locale}
                                onChange={(updater) =>
                                  setDraftExercise((currentDraft) =>
                                    currentDraft ? updater(currentDraft) : currentDraft,
                                  )
                                }
                              />
                            }
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
    </PageContent>
  );
}
