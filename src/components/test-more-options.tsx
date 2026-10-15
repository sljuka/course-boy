import { Info, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GradeBandsEditor, GradeBandsSummary } from "@/components/grade-bands-editor";
import { countMatchingExercises } from "@/components/test-editor-prototype-logic";
import type { BlueprintRule, CourseTagDefinition, TestEditorState } from "@/components/test-editor-prototype-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import {
  isExerciseCount,
  LONG_TEST_EXERCISE_COUNT,
  MAX_EXERCISE_COUNT,
  summarizeCourseExercisePool,
} from "@/lib/course-exercise-pool";
import type { CourseTest } from "@/lib/course-package";
import { type GradeBand, resolveGradeBands } from "@/lib/grade-bands";

// Randomization picks exercises by their tags: offered once the course has
// two or more.
const MIN_TAGS_FOR_RANDOMIZATION = 2;

type UpdateState = (updater: (state: TestEditorState) => TestEditorState) => void;

// A test's settings that most tests don't need (SLJ-135), each a checkbox
// that's off for a plain test: grade bands of its own (a graded test only),
// exercise randomization (its rules show once it's on), and the course's
// mnemonics in the prompts.
export function TestMoreOptions({
  courseGradeBands,
  courseTests,
  descriptiveTags,
  isStandalone,
  open,
  onOpenChange,
  state,
  testId,
  updateState,
}: {
  courseGradeBands: GradeBand[] | null;
  // Every test in the course, as saved: a final test's pool (SLJ-136).
  courseTests: CourseTest[];
  descriptiveTags: CourseTagDefinition[];
  // A section's own test, not a lesson's: shows its start screen unless
  // turned off (SLJ-137).
  isStandalone: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: TestEditorState;
  testId: string;
  updateState: UpdateState;
}) {
  const { t } = useTranslation();
  const ownBands = state.graded && state.gradeBands !== null;
  // Picking by tags needs a few to pick by. A test already randomized can
  // still be turned off.
  const canRandomize = state.useBlueprint || descriptiveTags.length >= MIN_TAGS_FOR_RANDOMIZATION;

  return (
    <Collapsible onOpenChange={onOpenChange} open={open}>
      <CollapsibleTrigger data-testid="test-more-options">{t("testEditor.moreOptions")}</CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label>
                <Checkbox
                  checked={ownBands}
                  data-testid="test-own-grade-bands"
                  disabled={!state.graded}
                  onCheckedChange={(checked) =>
                    updateState((current) => ({
                      ...current,
                      gradeBands: checked ? resolveGradeBands(null, courseGradeBands) : null,
                    }))
                  }
                />
                {t("testEditor.ownGradeBands")}
              </Label>
              <InfoTooltip>{t("testEditor.ownGradeBandsHelp")}</InfoTooltip>
            </div>
            {state.graded && (
              <div className="pl-6">
                {state.gradeBands ? (
                  <GradeBandsEditor
                    idPrefix="test"
                    onChange={(gradeBands) => updateState((current) => ({ ...current, gradeBands }))}
                    value={state.gradeBands}
                  />
                ) : (
                  <GradeBandsSummary bands={resolveGradeBands(null, courseGradeBands)} />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Label>
              <Checkbox
                checked={state.showStartScreen ?? isStandalone}
                data-testid="test-show-start-screen"
                onCheckedChange={(checked) =>
                  // Kept only when it differs from the default.
                  updateState((current) => ({ ...current, showStartScreen: checked === isStandalone ? null : checked }))
                }
              />
              {t("testEditor.showStartScreen")}
            </Label>
            <InfoTooltip>{t("testEditor.showStartScreenHelp")}</InfoTooltip>
          </div>

          <div className="flex items-center gap-2">
            <Label>
              <Checkbox
                checked={state.graded && state.showSummary}
                data-testid="test-show-summary"
                disabled={!state.graded}
                onCheckedChange={(checked) => updateState((current) => ({ ...current, showSummary: checked }))}
              />
              {t("testEditor.showSummary")}
            </Label>
            <InfoTooltip>{t("testEditor.showSummaryHelp")}</InfoTooltip>
          </div>

          <div className="flex items-center gap-2">
            <Label>
              <Checkbox
                checked={state.graded && state.partialCredit}
                data-testid="test-partial-credit"
                disabled={!state.graded}
                onCheckedChange={(checked) => updateState((current) => ({ ...current, partialCredit: checked }))}
              />
              {t("testEditor.partialCredit")}
            </Label>
            <InfoTooltip>{t("testEditor.partialCreditHelp")}</InfoTooltip>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label>
                <Checkbox
                  checked={state.includeCourseExercises}
                  data-testid="test-include-course-exercises"
                  onCheckedChange={() =>
                    updateState((current) => ({ ...current, includeCourseExercises: !current.includeCourseExercises }))
                  }
                />
                {t("testEditor.includeCourseExercises")}
              </Label>
              <InfoTooltip>{t("testEditor.includeCourseExercisesHelp")}</InfoTooltip>
            </div>
            {state.includeCourseExercises && (
              <CourseExercisesOptions courseTests={courseTests} state={state} testId={testId} updateState={updateState} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label>
                <Checkbox
                  checked={state.useBlueprint}
                  data-testid="test-randomize"
                  disabled={!canRandomize}
                  onCheckedChange={() => updateState((current) => ({ ...current, useBlueprint: !current.useBlueprint }))}
                />
                {t("testEditor.randomize")}
              </Label>
              <InfoTooltip>
                {t("testEditor.randomizeHelp")}
                {!canRandomize && ` ${t("testEditor.randomizeNeedsTags", { count: MIN_TAGS_FOR_RANDOMIZATION })}`}
              </InfoTooltip>
            </div>
            {state.useBlueprint && (
              <RandomizationRules descriptiveTags={descriptiveTags} state={state} updateState={updateState} />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Label>
              <Checkbox
                checked={state.showMnemonics}
                data-testid="test-show-mnemonics"
                onCheckedChange={() => updateState((current) => ({ ...current, showMnemonics: !current.showMnemonics }))}
              />
              {t("mnemonics.showInTest")}
            </Label>
            <InfoTooltip>{t("mnemonics.showInTestHelp")}</InfoTooltip>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// A final test's pool and how many of it each attempt picks: all of them,
// a number picked round robin, or (with randomization) the tag rules' total.
function CourseExercisesOptions({
  courseTests,
  state,
  testId,
  updateState,
}: {
  courseTests: CourseTest[];
  state: TestEditorState;
  testId: string;
  updateState: UpdateState;
}) {
  const { t } = useTranslation();
  const pool = summarizeCourseExercisePool(testId, state.exercises.length, courseTests);
  const rulesTotal = state.blueprint.reduce((sum, rule) => sum + rule.count, 0);
  const isLong = !state.useBlueprint && state.exerciseCount === null && pool.exercises > LONG_TEST_EXERCISE_COUNT;

  return (
    <div className="flex flex-col gap-3 pl-6">
      <FieldDescription data-testid="course-exercise-pool">
        {t("testEditor.coursePool", { exercises: pool.exercises, tests: pool.tests })}
      </FieldDescription>
      <Field>
        <FieldLabel htmlFor="test-exercise-count">{t("testEditor.exerciseCount")}</FieldLabel>
        {/* A vertical Field stretches its children: the wrapper takes that. */}
        <div>
          <Input
            className="w-24"
            data-testid="test-exercise-count"
            disabled={state.useBlueprint}
            id="test-exercise-count"
            inputMode="numeric"
            max={MAX_EXERCISE_COUNT}
            min={1}
            onChange={(event) => {
              const count = Number(event.target.value);
              updateState((current) => ({
                ...current,
                exerciseCount: event.target.value.trim() !== "" && isExerciseCount(count) ? count : null,
              }));
            }}
            placeholder={t("testEditor.exerciseCountAll")}
            type="number"
            value={state.useBlueprint ? rulesTotal : (state.exerciseCount ?? "")}
          />
        </div>
        <FieldDescription>
          {state.useBlueprint ? t("testEditor.exerciseCountFromRules") : t("testEditor.exerciseCountHelp")}
        </FieldDescription>
      </Field>
      {isLong && (
        <Alert data-testid="long-test-alert" variant="info">
          <Info aria-hidden="true" />
          <AlertDescription>{t("testEditor.longTest", { count: pool.exercises })}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// A rule per tag: how many of the exercises with it each attempt picks.
function RandomizationRules({
  descriptiveTags,
  state,
  updateState,
}: {
  descriptiveTags: CourseTagDefinition[];
  state: TestEditorState;
  updateState: UpdateState;
}) {
  const { t } = useTranslation();

  function updateRule(ruleId: string, nextRule: Partial<BlueprintRule>) {
    updateState((current) => ({
      ...current,
      blueprint: current.blueprint.map((rule) => (rule.id === ruleId ? { ...rule, ...nextRule } : rule)),
    }));
  }

  // A teacher adds each rule themselves: rules added on their own once made
  // the editor save in a loop (see `TestEditorPrototype`).
  function addRule() {
    updateState((current) => ({
      ...current,
      blueprint: [
        ...current.blueprint,
        { count: 1, id: `rule_${Math.random().toString(36).slice(2, 8)}`, tagId: descriptiveTags[0]?.id ?? "" },
      ],
    }));
  }

  return (
    <div className="flex flex-col gap-3 pl-6">
      {state.blueprint.map((rule) => {
        const available = countMatchingExercises(state.exercises, rule.tagId);
        const selectedTag = descriptiveTags.find((tag) => tag.id === rule.tagId);
        const tagLabel = selectedTag?.label ?? rule.tagId;

        return (
          <div className="flex flex-col gap-1" key={rule.id}>
            <div className="flex items-center gap-2">
              <Select onValueChange={(value) => updateRule(rule.id, { tagId: value ?? "" })} value={rule.tagId ?? undefined}>
                <SelectTrigger aria-label={t("testEditor.ruleTag")} className="w-56">
                  {/* The tag as it looks elsewhere, not its id (Base UI shows the
                      value unless told otherwise). */}
                  <SelectValue placeholder={t("testEditor.ruleTagPlaceholder")}>
                    {selectedTag && <Tag color={selectedTag.color}>{selectedTag.label}</Tag>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {descriptiveTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <Tag color={tag.color}>{tag.label}</Tag>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label={t("testEditor.ruleCount")}
                className="w-20"
                min={1}
                onChange={(event) => updateRule(rule.id, { count: Math.max(1, Number(event.target.value) || 1) })}
                type="number"
                value={rule.count}
              />
            </div>
            {rule.tagId && available < rule.count && (
              <CardDescription className="text-warning">
                {t("testEditor.ruleShortage", { available, count: rule.count, tag: tagLabel })}
              </CardDescription>
            )}
          </div>
        );
      })}
      <div>
        <Button onClick={addRule} size="sm" variant="secondary">
          <Plus aria-hidden="true" />
          {t("testEditor.addRule")}
        </Button>
      </div>
    </div>
  );
}
