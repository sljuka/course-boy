import type { Locale } from "@/lib/i18n";
import type { CourseTagDefinition } from "@/lib/course-tags";

type BlueprintRule = {
  count: number;
  id: string;
  tagId: string;
};

type ExerciseLocaleContent = {
  answerPlaceholder: string;
  hint: string;
  prompt: string;
};

type MultipleChoiceExerciseLocaleContent = {
  hint: string;
  options: string[];
  prompt: string;
};

type VariableConstraintType =
  | "min-value"
  | "max-value"
  | "even-number"
  | "odd-number";

type VariableConstraint = {
  id: string;
  type: VariableConstraintType;
  value: number | null;
};

type PromptVariable = {
  constraints: VariableConstraint[];
  id: string;
  name: string;
};

type NumericSolutionSpace = "sm" | "md" | "lg" | "xl";

type NumericTestExercise = {
  kind: "numeric";
  id: string;
  locales: Record<string, ExerciseLocaleContent>;
  solution: string;
  solutionSpace: NumericSolutionSpace;
  tagIds: string[];
  variables: PromptVariable[];
};

type MultipleChoiceTestExercise = {
  kind: "multiple-choice";
  correctOptionIndexes: number[];
  id: string;
  locales: Record<string, MultipleChoiceExerciseLocaleContent>;
  selectionMode: "single" | "multiple";
  tagIds: string[];
};

type WordTypeDefinitionDraft = {
  // A named `CourseTagColor` or an arbitrary CSS color string (e.g. a hex
  // value from the custom color picker) — see `isValidWordTypeColor`.
  color: string;
  icon: string;
  id: string;
  names: Record<string, string>;
  symbol: string;
};

type WordTypeExerciseLocaleContent = {
  hint: string;
  prompt: string;
  text: string;
};

type WordTypeTestExercise = {
  kind: "word-types";
  id: string;
  locales: Record<string, WordTypeExerciseLocaleContent>;
  tagIds: string[];
  wordTypes: WordTypeDefinitionDraft[];
};

type MissingWordVariableDraft = {
  // Raw, as typed — e.g. "Paris" or "Solution1, Solution2, Solution3".
  // Split into a trimmed, non-empty string[] only when saving (toShared).
  answers: string;
  matchCase: boolean;
  name: string;
};

type MissingWordExerciseLocaleContent = {
  hint: string;
  prompt: string;
  text: string;
  variables: MissingWordVariableDraft[];
};

type MissingWordTestExercise = {
  kind: "missing-word";
  id: string;
  locales: Record<string, MissingWordExerciseLocaleContent>;
  tagIds: string[];
};

type RegionPickerExerciseLocaleContent = {
  hint: string;
  prompt: string;
};

type RegionPickerTestExercise = {
  kind: "region-picker";
  correctShapeIds: string[];
  id: string;
  locales: Record<string, RegionPickerExerciseLocaleContent>;
  markerColor: string;
  svgAssetFilename: string;
  tagIds: string[];
  viewBox?: string;
};

type RegionMarkerRegionDraft = {
  color: string;
  id: string;
  labels: Record<string, string>;
};

type RegionMarkerExerciseLocaleContent = {
  hint: string;
  prompt: string;
};

type RegionMarkerTestExercise = {
  kind: "region-marker";
  id: string;
  locales: Record<string, RegionMarkerExerciseLocaleContent>;
  regions: RegionMarkerRegionDraft[];
  svgAssetFilename: string;
  tagIds: string[];
  viewBox?: string;
};

type RegionLabelRegionDraft = {
  color: string;
  id: string;
  // Raw, as typed, per locale — e.g. "Paris" or "Solution1, Solution2".
  // Split into a trimmed, non-empty string[] only when saving (toShared),
  // same convention as `MissingWordVariableDraft.answers`.
  answers: Record<string, string>;
  matchCase: boolean;
  labelOffset?: { dx: number; dy: number };
};

type RegionLabelExerciseLocaleContent = {
  hint: string;
  prompt: string;
};

type RegionLabelTestExercise = {
  kind: "region-label";
  id: string;
  locales: Record<string, RegionLabelExerciseLocaleContent>;
  regions: RegionLabelRegionDraft[];
  svgAssetFilename: string;
  tagIds: string[];
  viewBox?: string;
};

type TestExercise =
  | NumericTestExercise
  | MultipleChoiceTestExercise
  | WordTypeTestExercise
  | MissingWordTestExercise
  | RegionPickerTestExercise
  | RegionMarkerTestExercise
  | RegionLabelTestExercise;

type TestEditorState = {
  activeExerciseId: string;
  blueprint: BlueprintRule[];
  description: string;
  exercises: TestExercise[];
  selectedAdvancedSections: string[];
  selectedLocale: Locale;
  strictAdvancement: boolean;
  title: string;
  useBlueprint: boolean;
};

type SolutionValidationResult =
  | { status: "idle" }
  | {
      message: string;
      sampleResult?: number;
      sampleVariables?: Record<string, number>;
      status: "error" | "valid" | "warning";
    };

export type {
  BlueprintRule,
  CourseTagDefinition,
  ExerciseLocaleContent,
  MissingWordExerciseLocaleContent,
  MissingWordTestExercise,
  MissingWordVariableDraft,
  MultipleChoiceExerciseLocaleContent,
  MultipleChoiceTestExercise,
  NumericSolutionSpace,
  NumericTestExercise,
  PromptVariable,
  RegionLabelExerciseLocaleContent,
  RegionLabelRegionDraft,
  RegionLabelTestExercise,
  RegionMarkerExerciseLocaleContent,
  RegionMarkerRegionDraft,
  RegionMarkerTestExercise,
  RegionPickerExerciseLocaleContent,
  RegionPickerTestExercise,
  SolutionValidationResult,
  TestEditorState,
  TestExercise,
  VariableConstraint,
  VariableConstraintType,
  WordTypeDefinitionDraft,
  WordTypeExerciseLocaleContent,
  WordTypeTestExercise,
};
