import { buildCourseExercisePool, pickRoundRobin } from "@/lib/course-exercise-pool";
import type { CourseExercise, CourseTest, CourseTestStructureRule } from "@/lib/course-package";
import { getExerciseKindRuntime } from "@/lib/exercise-kinds/registry";
import { replaceTemplateVariables } from "@/lib/template-variables";

export type ExerciseInstance =
  | { kind: "numeric"; expectedAnswer: number; variables: Record<string, number> }
  | { kind: "multiple-choice"; optionOrder: number[] }
  | { kind: "word-types" }
  | { kind: "missing-word" }
  | { kind: "region-picker" }
  | { kind: "region-marker" }
  | { kind: "region-label" };

export function interpolateTemplate(
  template: string,
  variables: Record<string, number>,
  options: { emphasizeValues?: boolean } = {},
): string {
  return replaceTemplateVariables(template, (variableName) => {
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

// A numeric exercise's prompt is a template with `{{variable}}` placeholders
// filled from its instance's randomized values; every other kind's prompt is
// shown as-is. Shared by the all-at-once and interactive test views so both
// render numeric prompts identically.
export function getExercisePromptSource(
  exercise: CourseExercise,
  instance: ExerciseInstance,
): string {
  if (exercise.kind === "numeric" && instance.kind === "numeric") {
    return interpolateTemplate(exercise.prompt, instance.variables, {
      emphasizeValues: true,
    });
  }

  return exercise.prompt;
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
// else off either shape. `courseTests`: every test in the course, in course
// order (`listCourseTests`), for a final test that includes their exercises
// (SLJ-136): the tag rules pick from all of them, else `exerciseCount` picked
// round robin, else all.
export function buildTestExerciseSequence(
  lesson: { test: CourseTest | null },
  courseTests: CourseTest[] = [],
): CourseExercise[] {
  const test = lesson.test;

  if (!test) {
    return [];
  }

  if (test.includeCourseExercises) {
    const sources = buildCourseExercisePool(test, courseTests);
    const exercises = sources.flatMap((source) => source.exercises);

    if (test.structure && test.structure.length > 0) {
      return pickByTagRules(exercises, test.structure);
    }

    return test.exerciseCount ? pickRoundRobin(sources, test.exerciseCount) : exercises;
  }

  if (!test.structure || test.structure.length === 0) {
    return test.exercises;
  }

  return pickByTagRules(test.exercises, test.structure);
}

function pickByTagRules(exercises: CourseExercise[], structure: CourseTestStructureRule[]): CourseExercise[] {
  const remainingExercises = [...exercises];
  const selectedExercises: CourseExercise[] = [];

  for (const rule of structure) {
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
  return selectedExercises.length > 0 ? selectedExercises : exercises;
}
