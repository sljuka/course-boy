import type { Locale } from "@/lib/i18n";
import {
  createCourseTagDefinition,
  isCourseTagColor,
  normalizeCourseTagLabel,
  type CourseTagDefinition,
} from "@/lib/course-tags";

import type {
  BlueprintRule,
  NumericTestExercise,
  TestEditorState,
  TestExercise,
} from "@/components/test-editor-prototype-types";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialState(locales: Locale[], title: string): TestEditorState {
  return {
    activeExerciseId: "",
    blueprint: [
      { count: 3, id: createId("rule"), tagId: "easy" },
      { count: 2, id: createId("rule"), tagId: "medium" },
      { count: 1, id: createId("rule"), tagId: "challenging" },
    ] satisfies BlueprintRule[],
    description: "",
    exercises: [],
    selectedAdvancedSections: [],
    selectedLocale: locales[0] ?? "en",
    strictAdvancement: true,
    title,
    useBlueprint: false,
  };
}

function createInitialCourseTags(): CourseTagDefinition[] {
  return [
    {
      color: "emerald",
      id: "easy",
      label: "Easy",
    },
    {
      color: "amber",
      id: "medium",
      label: "Medium",
    },
    {
      color: "rose",
      id: "challenging",
      label: "Challenging",
    },
  ];
}

function countMatchingExercises(exercises: TestExercise[], tagId: string) {
  return exercises.filter((exercise) => exercise.tagIds.includes(tagId)).length;
}

function normalizeDraftTestData(
  rawTestDrafts: Record<string, TestEditorState>,
  rawDescriptiveTags: CourseTagDefinition[] | undefined,
) {
  const normalizedDescriptiveTags = Array.isArray(rawDescriptiveTags)
    ? rawDescriptiveTags
        .filter(
          (tag): tag is CourseTagDefinition =>
            Boolean(tag) &&
            typeof tag.id === "string" &&
            typeof tag.label === "string" &&
            tag.id.trim().length > 0 &&
            normalizeCourseTagLabel(tag.label).length > 0 &&
            isCourseTagColor(tag.color),
        )
        .map((tag) => ({
          ...tag,
          label: normalizeCourseTagLabel(tag.label),
        }))
    : [];
  const tagIndex = new Map(
    normalizedDescriptiveTags.map(
      (tag) => [tag.id, tag] satisfies [string, CourseTagDefinition],
    ),
  );

  function ensureDescriptiveTagByLabel(label: string) {
    const normalizedLabel = normalizeCourseTagLabel(label);

    if (!normalizedLabel) {
      return "";
    }

    const existingTag = normalizedDescriptiveTags.find(
      (tag) => tag.label.toLowerCase() === normalizedLabel.toLowerCase(),
    );

    if (existingTag) {
      return existingTag.id;
    }

    const nextTag = createCourseTagDefinition(
      normalizedLabel,
      "sky",
      normalizedDescriptiveTags,
    );
    normalizedDescriptiveTags.push(nextTag);
    tagIndex.set(nextTag.id, nextTag);

    return nextTag.id;
  }

  function ensureDescriptiveTagById(tagId: string) {
    if (tagIndex.has(tagId)) {
      return tagId;
    }

    const nextTag = {
      color: "sky",
      id: tagId,
      label: tagId
        .split("-")
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    } satisfies CourseTagDefinition;
    normalizedDescriptiveTags.push(nextTag);
    tagIndex.set(nextTag.id, nextTag);

    return nextTag.id;
  }

  const normalizedTestDrafts = Object.fromEntries(
    Object.entries(rawTestDrafts ?? {}).map(([draftId, draftState]) => {
      const normalizedExercises = Array.isArray(draftState.exercises)
        ? draftState.exercises.map((exercise) => {
            const legacyTagLabels = Array.isArray(
              (exercise as TestExercise & { tags?: string[] }).tags,
            )
              ? (exercise as TestExercise & { tags?: string[] }).tags ?? []
              : [];
            const rawTagIds = Array.isArray(exercise.tagIds)
              ? exercise.tagIds
              : legacyTagLabels.map((tagLabel) =>
                  ensureDescriptiveTagByLabel(tagLabel),
                );
            const tagIds = [
              ...new Set(rawTagIds.map((tagId) => ensureDescriptiveTagById(tagId))),
            ];

            // A draft saved before multiple choice/word types existed has no
            // `kind` field at all — default it to "numeric", same as the
            // on-disk test JSON convention. Any *recognized* kind (present or
            // future) only ever needs its tagIds normalized here — its other
            // fields are already correctly shaped by whichever kind wrote them.
            if ((exercise as TestExercise).kind === undefined) {
              const numericExercise = exercise as NumericTestExercise;

              return {
                ...numericExercise,
                kind: "numeric",
                tagIds,
                variables: Array.isArray(numericExercise.variables)
                  ? numericExercise.variables
                  : [],
              } satisfies NumericTestExercise;
            }

            return { ...exercise, tagIds } as TestExercise;
          })
        : [];
      const normalizedBlueprint = Array.isArray(draftState.blueprint)
        ? draftState.blueprint.map((rule) => {
            const legacyTag = (rule as BlueprintRule & { tag?: string }).tag;
            const tagId =
              typeof (rule as BlueprintRule).tagId === "string" &&
              (rule as BlueprintRule).tagId.trim().length > 0
                ? ensureDescriptiveTagById((rule as BlueprintRule).tagId)
                : typeof legacyTag === "string"
                  ? ensureDescriptiveTagByLabel(legacyTag)
                  : "";

            return {
              count: Math.max(1, Number(rule.count) || 1),
              id: rule.id,
              tagId,
            } satisfies BlueprintRule;
          })
        : [];

      return [
        draftId,
        {
          ...draftState,
          activeExerciseId:
            typeof draftState.activeExerciseId === "string"
              ? draftState.activeExerciseId
              : "",
          blueprint: normalizedBlueprint,
          exercises: normalizedExercises,
          selectedAdvancedSections: Array.isArray(draftState.selectedAdvancedSections)
            ? draftState.selectedAdvancedSections
            : [],
          strictAdvancement:
            typeof draftState.strictAdvancement === "boolean"
              ? draftState.strictAdvancement
              : true,
        } satisfies TestEditorState,
      ];
    }),
  ) satisfies Record<string, TestEditorState>;

  if (normalizedDescriptiveTags.length === 0) {
    const fallbackTags = createInitialCourseTags();

    for (const tag of fallbackTags) {
      normalizedDescriptiveTags.push(tag);
      tagIndex.set(tag.id, tag);
    }
  }

  return {
    descriptiveTags: normalizedDescriptiveTags,
    testDrafts: normalizedTestDrafts,
  };
}

function toggleExerciseTag(
  exercise: TestExercise,
  tagId: string,
): TestExercise {
  const hasTag = exercise.tagIds.includes(tagId);

  return {
    ...exercise,
    tagIds: hasTag
      ? exercise.tagIds.filter((currentTagId) => currentTagId !== tagId)
      : [...exercise.tagIds, tagId],
  };
}

export {
  countMatchingExercises,
  createInitialState,
  createInitialCourseTags,
  normalizeDraftTestData,
  toggleExerciseTag,
};
