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

type NumericTestExercise = {
  kind: "numeric";
  id: string;
  locales: Record<string, ExerciseLocaleContent>;
  solution: string;
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

type TestExercise =
  | NumericTestExercise
  | MultipleChoiceTestExercise
  | WordTypeTestExercise
  | MissingWordTestExercise;

type TestEditorState = {
  activeExerciseId: string;
  blueprint: BlueprintRule[];
  description: string;
  exercises: TestExercise[];
  selectedAdvancedSections: string[];
  selectedLocale: Locale;
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
  NumericTestExercise,
  PromptVariable,
  SolutionValidationResult,
  TestEditorState,
  TestExercise,
  VariableConstraint,
  VariableConstraintType,
  WordTypeDefinitionDraft,
  WordTypeExerciseLocaleContent,
  WordTypeTestExercise,
};
