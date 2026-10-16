import type { Locale } from "@/lib/i18n";
import type { ExerciseMediaKind } from "@/lib/exercise-media";
import type { CourseTagDefinition } from "@/lib/course-tags";
import type { GradeBand } from "@/lib/grade-bands";

type BlueprintRule = {
  count: number;
  id: string;
  tagId: string;
};

type ExerciseLocaleContent = {
  answerPlaceholder: string;
  hint: string;
  prompt: string;
  // A numeric exercise's solution labels, one per solution, when it has
  // several (SLJ-139).
  solutionLabels?: string[];
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

// An image or video above the prompt (SLJ-56), as the editor holds it: the
// alt text per language sits here, and moves into each language's `locales`
// entry (`mediaAlt`) when saved; see lib/exercise-media.ts.
type ExerciseMediaDraft = {
  alt: Record<string, string>;
  assetFilename: string;
  decorative: boolean;
  kind: ExerciseMediaKind;
};

type NumericTestExercise = {
  kind: "numeric";
  id: string;
  media?: ExerciseMediaDraft;
  locales: Record<string, ExerciseLocaleContent>;
  solution: string;
  // Solutions after the first, each answered in its own box (SLJ-139).
  moreSolutions: { formula: string; id: string }[];
  solutionSpace: NumericSolutionSpace;
  tagIds: string[];
  variables: PromptVariable[];
};

type MultipleChoiceTestExercise = {
  kind: "multiple-choice";
  correctOptionIndexes: number[];
  id: string;
  media?: ExerciseMediaDraft;
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
  media?: ExerciseMediaDraft;
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
  media?: ExerciseMediaDraft;
  locales: Record<string, MissingWordExerciseLocaleContent>;
  tagIds: string[];
};

// A punctuation exercise (SLJ-145): each language's sentence with its marks.
type PunctuationExerciseLocaleContent = {
  hint: string;
  prompt: string;
  text: string;
};

type PunctuationTestExercise = {
  kind: "punctuation";
  id: string;
  media?: ExerciseMediaDraft;
  locales: Record<string, PunctuationExerciseLocaleContent>;
  // The marks the student places, as typed ("" for the default set).
  marks: string;
  tagIds: string[];
};

// A rewrite exercise (SLJ-146): each language's prompt, sentence to rewrite
// and accepted solutions.
type RewriteExerciseLocaleContent = {
  hint: string;
  prompt: string;
  solutions: string[];
  source: string;
};

type RewriteTestExercise = {
  kind: "rewrite";
  acceptWithoutDiacritics: boolean;
  id: string;
  matchCase: boolean;
  matchQuotes: boolean;
  media?: ExerciseMediaDraft;
  locales: Record<string, RewriteExerciseLocaleContent>;
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

// Points (SLJ-135) are the same for every kind: undefined is the default.
type TestExercise = (
  | NumericTestExercise
  | MultipleChoiceTestExercise
  | WordTypeTestExercise
  | MissingWordTestExercise
  | PunctuationTestExercise
  | RewriteTestExercise
  | RegionPickerTestExercise
  | RegionMarkerTestExercise
  | RegionLabelTestExercise
) & { points?: number };

type TestEditorState = {
  activeExerciseId: string;
  blueprint: BlueprintRule[];
  description: string;
  exercises: TestExercise[];
  // A graded test (SLJ-135), and its own grade bands (null: the course's).
  graded: boolean;
  gradeBands: GradeBand[] | null;
  // A final test (SLJ-136): the course's other tests' exercises too, and how
  // many to pick round robin (null: all).
  includeCourseExercises: boolean;
  exerciseCount: number | null;
  // A graded test's partial credit (SLJ-135).
  partialCredit: boolean;
  // The start screen (SLJ-137); null: the default (shown for a section
  // test, not a lesson's).
  showStartScreen: boolean | null;
  // A graded test's summary after the test (SLJ-140).
  showSummary: boolean;
  // A practice test: showing the correct answer after a wrong one (SLJ-141).
  allowShowAnswer: boolean;
  selectedLocale: Locale;
  showMnemonics: boolean;
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
  ExerciseMediaDraft,
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
  PunctuationExerciseLocaleContent,
  PunctuationTestExercise,
  RegionLabelExerciseLocaleContent,
  RegionLabelRegionDraft,
  RegionLabelTestExercise,
  RegionMarkerExerciseLocaleContent,
  RegionMarkerRegionDraft,
  RegionMarkerTestExercise,
  RegionPickerExerciseLocaleContent,
  RegionPickerTestExercise,
  RewriteExerciseLocaleContent,
  RewriteTestExercise,
  SolutionValidationResult,
  TestEditorState,
  TestExercise,
  VariableConstraint,
  VariableConstraintType,
  WordTypeDefinitionDraft,
  WordTypeExerciseLocaleContent,
  WordTypeTestExercise,
};
