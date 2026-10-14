import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GradeBandsEditor, GradeBandsSummary } from "@/components/grade-bands-editor";
import { countMatchingExercises } from "@/components/test-editor-prototype-logic";
import type { BlueprintRule, CourseTagDefinition, TestEditorState } from "@/components/test-editor-prototype-types";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  descriptiveTags,
  open,
  onOpenChange,
  state,
  updateState,
}: {
  courseGradeBands: GradeBand[] | null;
  descriptiveTags: CourseTagDefinition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: TestEditorState;
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
        const tagLabel = descriptiveTags.find((tag) => tag.id === rule.tagId)?.label ?? rule.tagId;

        return (
          <div className="flex flex-col gap-1" key={rule.id}>
            <div className="flex items-center gap-2">
              <Select onValueChange={(value) => updateRule(rule.id, { tagId: value ?? "" })} value={rule.tagId ?? undefined}>
                <SelectTrigger aria-label={t("testEditor.ruleTag")} className="w-56">
                  <SelectValue placeholder={t("testEditor.ruleTagPlaceholder")} />
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
