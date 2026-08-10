import type { Locale } from "@/lib/i18n";

type BlueprintRule = {
  count: number;
  id: string;
  tag: string;
};

type ExerciseLocaleContent = {
  hint: string;
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

type TestExercise = {
  id: string;
  locales: Record<string, ExerciseLocaleContent>;
  solution: string;
  variables: PromptVariable[];
};

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
  ExerciseLocaleContent,
  PromptVariable,
  SolutionValidationResult,
  TestEditorState,
  TestExercise,
  VariableConstraint,
  VariableConstraintType,
};
