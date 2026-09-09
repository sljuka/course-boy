import type { CourseExercise, CourseLesson } from "@/lib/course-package";
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry";

export type ExerciseInstance =
  | { kind: "numeric"; expectedAnswer: number; variables: Record<string, number> }
  | { kind: "multiple-choice"; optionOrder: number[] }
  | { kind: "word-types" };

export function interpolateTemplate(
  template: string,
  variables: Record<string, number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
    return String(variables[variableName] ?? "");
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
