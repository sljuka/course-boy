import { useCallback, useState } from "react";

import type { StructureSelection } from "@/components/course-structure-prototype/course-structure-prototype-types";
import type { CourseLayoutOutletContext } from "@/components/course-layout";
import { PageContent } from "@/components/page-content";
import { TestEditorPrototype } from "@/components/test-editor-prototype";
import { createInitialState } from "@/components/test-editor-prototype-logic";
import {
  fromSharedTestDefinition,
  toSharedTestDefinition,
} from "@/components/test-editor-prototype-persistence";
import type { TestEditorState } from "@/components/test-editor-prototype-types";
import type {
  CourseSectionPreview,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
} from "@/lib/course-package";
import { normalizeCourseTagLabel, type CourseTagDefinition } from "@/lib/course-tags";
import type { Locale } from "@/lib/i18n";
import {
  useLessonTestDraftQuery,
  useSaveLessonTestMutation,
  useSaveSectionTestMutation,
  useSectionTestDraftQuery,
} from "@/lib/course-queries";
import { resolveLessonIdForTest } from "@/lib/course-test-id";
import { useEntityAutosave, useForwardAutosaveStatus } from "@/lib/use-entity-autosave";

// A registered tag is one that shows up in the "Add tag" combobox — an
// exercise or blueprint rule referencing anything else (typically a tag
// deleted from another session, or set by hand via a direct IPC call) is
// stripped at save time. See the "known rough edge" note in CLAUDE.md.
function toPersistableSharedTestDefinition(
  state: TestEditorState,
  descriptiveTags: CourseTagDefinition[],
): SharedTestDefinition {
  const registeredTagIds = new Set(
    descriptiveTags
      .filter((tag) => normalizeCourseTagLabel(tag.label).length > 0)
      .map((tag) => tag.id),
  );
  const shared = toSharedTestDefinition(state);

  return {
    ...shared,
    exercises: shared.exercises.map((exercise) => ({
      ...exercise,
      tags: exercise.tags.filter((tagId) => registeredTagIds.has(tagId)),
    })),
    ...(shared.structure
      ? { structure: shared.structure.filter((rule) => registeredTagIds.has(rule.tag)) }
      : {}),
  };
}

// A selected "test" node is either a standalone CourseSectionTest (its id is
// found directly in some section's `tests`) or a lesson-attached test (its
// id is derived from a lesson id via resolveLessonIdForTest) — these are two
// different persisted things with different save/draft plumbing.
export function DraftTestEditor({
  courseId,
  courseSections,
  descriptiveTags,
  reportAutosaveStatus,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  courseSections: CourseSectionPreview[];
  descriptiveTags: CourseTagDefinition[];
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const standaloneSectionId =
    courseSections.find((section) => section.tests.some((test) => test.id === selectedNode.id))
      ?.id ?? null;
  const isStandalone = standaloneSectionId !== null;
  const lessonId = isStandalone ? null : resolveLessonIdForTest(selectedNode.id);
  const lessonSectionId = lessonId
    ? (courseSections.find((section) => section.lessons.some((lesson) => lesson.id === lessonId))
        ?.id ?? null)
    : null;

  const lessonTestDraftQuery = useLessonTestDraftQuery(
    !isStandalone && lessonId && lessonSectionId
      ? { courseId, lessonId, sectionId: lessonSectionId }
      : null,
  );
  const sectionTestDraftQuery = useSectionTestDraftQuery(
    isStandalone && standaloneSectionId
      ? { courseId, sectionId: standaloneSectionId, testId: selectedNode.id }
      : null,
  );
  const activeQuery = isStandalone ? sectionTestDraftQuery : lessonTestDraftQuery;

  // `isFetching` (not just `isLoading`) matters here: a fresh mount of this
  // page (e.g. returning from the "Preview test" route) can find this query
  // already cached from earlier in the session but stale — invalidated once
  // this test's own autosave landed — which would otherwise serve the *old*
  // cached value instantly while a refetch runs in the background.
  if (activeQuery.isLoading || activeQuery.isFetching) {
    return <PageContent>{null}</PageContent>;
  }

  if (isStandalone) {
    return (
      <DraftStandaloneTestEditor
        courseId={courseId}
        descriptiveTags={descriptiveTags}
        initialSharedTest={sectionTestDraftQuery.data ?? null}
        reportAutosaveStatus={reportAutosaveStatus}
        sectionId={standaloneSectionId!}
        selectedNode={selectedNode}
        supportedLocales={supportedLocales}
      />
    );
  }

  // This test is attached to (follows) its own lesson document — default its
  // name to that document's title rather than the generic "Test", for the
  // same reason a standalone test defaults to the section's last document's
  // title (see `startAddTest` in course-structure-prototype.tsx).
  const lessonTitle = courseSections
    .flatMap((section) => section.lessons)
    .find((lesson) => lesson.id === lessonId)?.title;

  return (
    <DraftLessonTestEditor
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialSharedTest={lessonTestDraftQuery.data ?? null}
      initialTitle={lessonTitle || "Test"}
      lessonId={lessonId!}
      reportAutosaveStatus={reportAutosaveStatus}
      sectionId={lessonSectionId!}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}

function DraftStandaloneTestEditor({
  courseId,
  descriptiveTags,
  initialSharedTest,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  initialSharedTest: SharedTestDefinition | null;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const [seed] = useState<TestEditorState>(() =>
    initialSharedTest
      ? fromSharedTestDefinition(initialSharedTest, supportedLocales)
      : createInitialState(supportedLocales, selectedNode.title),
  );
  const [testState, setTestState] = useState<TestEditorState>(seed);
  const saveSectionTestMutation = useSaveSectionTestMutation();

  const buildInput = useCallback(
    (state: TestEditorState): SaveSectionTestInput => ({
      courseId,
      sectionId,
      test: toPersistableSharedTestDefinition(state, descriptiveTags),
      testId: selectedNode.id,
    }),
    [courseId, descriptiveTags, sectionId, selectedNode.id],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: saveSectionTestMutation,
    value: testState,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  // Unlike a lesson-attached test, a standalone test's own file does carry a
  // real title (selectedNode.title, sourced from CourseSectionTest) — but
  // SharedTestDefinition still has no title field, so an edit made inside
  // TestEditorPrototype's own title input doesn't round-trip on save any
  // more than it does for a lesson-attached test today.
  return (
    <TestEditorPrototype
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialState={testState}
      initialTitle={selectedNode.title}
      onStateChange={setTestState}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}

function DraftLessonTestEditor({
  courseId,
  descriptiveTags,
  initialSharedTest,
  initialTitle,
  lessonId,
  reportAutosaveStatus,
  sectionId,
  selectedNode,
  supportedLocales,
}: {
  courseId: string;
  descriptiveTags: CourseTagDefinition[];
  initialSharedTest: SharedTestDefinition | null;
  initialTitle: string;
  lessonId: string;
  reportAutosaveStatus: CourseLayoutOutletContext["reportAutosaveStatus"];
  sectionId: string;
  selectedNode: StructureSelection;
  supportedLocales: Locale[];
}) {
  const [seed] = useState<TestEditorState>(() =>
    initialSharedTest
      ? fromSharedTestDefinition(initialSharedTest, supportedLocales)
      : createInitialState(supportedLocales, initialTitle),
  );
  const [testState, setTestState] = useState<TestEditorState>(seed);
  const saveLessonTestMutation = useSaveLessonTestMutation();

  const buildInput = useCallback(
    (state: TestEditorState): SaveLessonTestInput => ({
      courseId,
      lessonId,
      sectionId,
      test: toPersistableSharedTestDefinition(state, descriptiveTags),
    }),
    [courseId, descriptiveTags, lessonId, sectionId],
  );

  const autosave = useEntityAutosave({
    buildInput,
    initialValue: seed,
    mutation: saveLessonTestMutation,
    value: testState,
  });

  useForwardAutosaveStatus(reportAutosaveStatus, autosave);

  return (
    <TestEditorPrototype
      courseId={courseId}
      descriptiveTags={descriptiveTags}
      initialState={testState}
      initialTitle={initialTitle}
      onStateChange={setTestState}
      selectedNode={selectedNode}
      supportedLocales={supportedLocales}
    />
  );
}
