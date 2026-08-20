import type {
  CourseExercise,
  CourseExerciseVariable,
  CourseLesson,
} from "@/lib/course-package";
import { evaluateFormula } from "@/lib/formula-dsl";

export type ExerciseInstance = {
  expectedAnswer: number;
  variables: Record<string, number>;
};

export function roundToPrecision(value: number, precision: number): number {
  const multiplier = 10 ** precision;

  return Math.round(value * multiplier) / multiplier;
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
    return String(variables[variableName] ?? "");
  });
}

const MAX_PARITY_RESAMPLE_ATTEMPTS = 50;

function matchesParity(value: number, parity: "even" | "odd" | undefined): boolean {
  return !parity || (value % 2 === 0) === (parity === "even");
}

function nearestValueWithParity(
  min: number,
  max: number,
  parity: "even" | "odd" | undefined,
): number {
  for (let value = min; value <= max; value += 1) {
    if (matchesParity(value, parity)) {
      return value;
    }
  }

  return min;
}

export function rollVariableValue(definition: CourseExerciseVariable): number {
  const span = definition.max - definition.min + 1;

  for (let attempt = 0; attempt < MAX_PARITY_RESAMPLE_ATTEMPTS; attempt += 1) {
    const candidate = Math.floor(Math.random() * span) + definition.min;

    if (matchesParity(candidate, definition.parity)) {
      return candidate;
    }
  }

  return nearestValueWithParity(definition.min, definition.max, definition.parity);
}

export function buildExerciseInstance(exercise: CourseExercise): ExerciseInstance {
  const variables = Object.fromEntries(
    Object.entries(exercise.variables).map(([variableName, variableDefinition]) => {
      return [variableName, rollVariableValue(variableDefinition)];
    }),
  );
  const expectedAnswer = roundToPrecision(
    evaluateFormula(exercise.formula, variables),
    exercise.precision,
  );

  return {
    expectedAnswer,
    variables,
  };
}

function shuffleExercises(exercises: CourseExercise[]): CourseExercise[] {
  const nextExercises = [...exercises];

  for (let currentIndex = nextExercises.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    const currentExercise = nextExercises[currentIndex];
    nextExercises[currentIndex] = nextExercises[randomIndex];
    nextExercises[randomIndex] = currentExercise;
  }

  return nextExercises;
}

export function buildTestExerciseSequence(lesson: CourseLesson): CourseExercise[] {
  if (!lesson.test) {
    return [];
  }

  if (!lesson.test.structure || lesson.test.structure.length === 0) {
    return lesson.test.exercises;
  }

  const remainingExercises = [...lesson.test.exercises];
  const selectedExercises: CourseExercise[] = [];

  for (const rule of lesson.test.structure) {
    const matchingExercises = remainingExercises.filter((exercise) =>
      exercise.tags.includes(rule.tag),
    );

    if (matchingExercises.length < rule.count) {
      return lesson.test.exercises;
    }

    const chosenExercises = shuffleExercises(matchingExercises).slice(0, rule.count);

    for (const chosenExercise of chosenExercises) {
      const exerciseIndex = remainingExercises.findIndex(
        (exercise) => exercise.id === chosenExercise.id,
      );

      if (exerciseIndex >= 0) {
        selectedExercises.push(remainingExercises[exerciseIndex]);
        remainingExercises.splice(exerciseIndex, 1);
      }
    }
  }

  return selectedExercises;
}
