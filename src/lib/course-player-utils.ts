import type { CourseExercise, CourseTest } from "@/lib/course-package";
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry";

export type ExerciseInstance =
  | { kind: "numeric"; expectedAnswer: number; variables: Record<string, number> }
  | { kind: "multiple-choice"; optionOrder: number[] }
  | { kind: "word-types" }
  | { kind: "missing-word" }
  | { kind: "region-picker" }
  | { kind: "region-marker" };

export function interpolateTemplate(
  template: string,
  variables: Record<string, number>,
  options: { emphasizeValues?: boolean } = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
    const value = String(variables[variableName] ?? "");
    // `**value**` renders bold via InlineMarkdown — used for the prompt (the
    // substituted numbers should stand out against otherwise regular-weight
    // text), not for hints, which stay plain.
    return options.emphasizeValues ? `**${value}**` : value;
  });
}

export function buildExerciseInstance(exercise: CourseExercise): ExerciseInstance {
  return getExerciseKindRuntime(exercise.kind).buildInstance(exercise);
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

// Accepts either a lesson (its attached test) or a standalone CourseSectionTest
// — both carry a `test: CourseTest | null`, and nothing here reads anything
// else off either shape.
export function buildTestExerciseSequence(lesson: {
  test: CourseTest | null;
}): CourseExercise[] {
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

    // Take however many are available rather than requiring the full count —
    // a single underfilled rule should not throw away every other rule's
    // selection.
    const chosenExercises = shuffleExercises(matchingExercises).slice(
      0,
      Math.min(rule.count, matchingExercises.length),
    );

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

  // If literally nothing matched any rule, fall back to the full bank rather
  // than handing the student an empty test.
  return selectedExercises.length > 0 ? selectedExercises : lesson.test.exercises;
}
