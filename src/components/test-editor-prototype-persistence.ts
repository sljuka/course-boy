import { getExerciseKindEditor } from "@/components/exercise-kinds/registry";
import type {
  BlueprintRule,
  TestEditorState,
  TestExercise,
} from "@/components/test-editor-prototype-types";
import type {
  CourseTestStructureRule,
  SharedTestDefinition,
  SharedTestExerciseDefinition,
} from "@/lib/course-package";
import { supportsExerciseMedia } from "@/lib/exercise-media";
import type { Locale } from "@/lib/i18n";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toSharedTestExerciseDefinition(
  exercise: TestExercise,
): SharedTestExerciseDefinition {
  // Points are the same for every kind, and only written when set (SLJ-135).
  const kindShared = getExerciseKindEditor(exercise.kind).toShared(exercise);
  const shared = (
    exercise.points !== undefined ? { ...kindShared, points: exercise.points } : kindShared
  ) as SharedTestExerciseDefinition;
  const media = "media" in exercise ? exercise.media : undefined;

  if (!media || !supportsExerciseMedia(exercise.kind)) {
    return shared;
  }

  // The media itself on the exercise; its alt text into each language's
  // `locales` entry, next to the prompt (lib/exercise-media.ts).
  const locales = Object.fromEntries(
    Object.entries(shared.locales as Record<string, object>).map(([locale, content]) => {
      const mediaAlt = media.decorative ? "" : (media.alt[locale] ?? "").trim();

      return [locale, mediaAlt ? { ...content, mediaAlt } : content];
    }),
  );

  return {
    ...shared,
    locales,
    media: {
      assetFilename: media.assetFilename,
      kind: media.kind,
      ...(media.decorative ? { decorative: true } : {}),
    },
  } as SharedTestExerciseDefinition;
}

export function fromSharedTestExerciseDefinition(
  definition: SharedTestExerciseDefinition,
): TestExercise {
  // A test file written before multiple-choice/word-types existed has no
  // `kind` field at all — default it to "numeric", same as the backend's
  // read-time normalization in electron/course-registry.ts.
  const kind = definition.kind ?? "numeric";
  const kindExercise = getExerciseKindEditor(kind).fromShared(definition);
  const exercise = (
    definition.points !== undefined ? { ...kindExercise, points: definition.points } : kindExercise
  ) as TestExercise;
  const media = "media" in definition ? definition.media : undefined;

  if (!media || !supportsExerciseMedia(kind)) {
    return exercise;
  }

  const alt = Object.fromEntries(
    Object.entries(definition.locales).flatMap(([locale, content]) => {
      const mediaAlt = (content as { mediaAlt?: string } | undefined)?.mediaAlt;

      return mediaAlt ? [[locale, mediaAlt]] : [];
    }),
  );

  return {
    ...exercise,
    media: { alt, assetFilename: media.assetFilename, decorative: media.decorative ?? false, kind: media.kind },
  } as TestExercise;
}

export function toSharedTestDefinition(testState: TestEditorState): SharedTestDefinition {
  const structure: CourseTestStructureRule[] | undefined = testState.useBlueprint
    ? testState.blueprint.map((rule) => ({ count: rule.count, tag: rule.tagId }))
    : undefined;

  return {
    exercises: testState.exercises.map(toSharedTestExerciseDefinition),
    ...(testState.graded ? { graded: true } : {}),
    // Its own bands only on a graded test that has them.
    ...(testState.graded && testState.gradeBands ? { gradeBands: testState.gradeBands } : {}),
    ...(testState.includeCourseExercises ? { includeCourseExercises: true } : {}),
    // A count only where it picks: a final test without tag rules.
    ...(testState.includeCourseExercises && !testState.useBlueprint && testState.exerciseCount
      ? { exerciseCount: testState.exerciseCount }
      : {}),
    ...(testState.showMnemonics ? { showMnemonics: true } : {}),
    template: testState.description,
    ...(structure ? { structure } : {}),
  };
}

export function fromSharedTestDefinition(
  definition: SharedTestDefinition,
  supportedLocales: Locale[],
): TestEditorState {
  const exercises = definition.exercises.map(fromSharedTestExerciseDefinition);
  const blueprint: BlueprintRule[] = (definition.structure ?? []).map((rule) => ({
    count: rule.count,
    id: createId("rule"),
    tagId: rule.tag,
  }));

  return {
    activeExerciseId: exercises[0]?.id ?? "",
    blueprint,
    description: definition.template,
    exercises,
    graded: definition.graded ?? false,
    gradeBands: definition.gradeBands ?? null,
    includeCourseExercises: definition.includeCourseExercises ?? false,
    exerciseCount: definition.exerciseCount ?? null,
    selectedLocale: supportedLocales[0] ?? "en",
    showMnemonics: definition.showMnemonics ?? false,
    // Presence, not length: a teacher can enable randomization before
    // adding any rule yet, and `toSharedTestDefinition` above already
    // writes `structure: []` (not `undefined`) in that case — deriving
    // this from `.length > 0` instead would silently drop the toggle the
    // moment this round-trips through a save.
    useBlueprint: definition.structure !== undefined,
  };
}
