# Persistence Notes

## Recommended model

Use a hybrid persistence model:

- Course packages are stored as files.
- App state and user state are stored in a local database.

This keeps course content portable for future peer-to-peer sharing while giving the app a better place to store local-only state.

## Filesystem responsibilities

The filesystem should remain the source of truth for course package content:

- `course.json`
- sections
- lessons
- exercises
- localized content
- assets

Draft courses and published courses should both use the same package format on disk.

This avoids a second "convert draft to files" phase later and keeps export, publish, backup, and sharing workflows simpler.

## Database responsibilities

The local database should store app-level and user-level state such as:

- favorites
- bookmarks
- bookmark folders
- started courses
- finished courses
- progress
- recent activity
- last opened course
- draft metadata
- local indexing metadata

The database should reference courses by stable identifiers such as `courseId`, not duplicate the full course content structure.

## Drafts

Drafts should stay file-backed.

Do not treat the database as the canonical store for draft section, lesson, or exercise content. That would introduce a second representation of the course and create extra complexity when exporting or publishing.

Instead:

- keep draft content in files
- track draft status and local metadata in the database
- use the database to support UI and workflow state around those files

**Implementation.** The draft editor (`src/pages/draft-detail-page.tsx`) has no
aggregate in-memory or `localStorage` snapshot of the whole course draft. Each
editable entity — course metadata, one section, one document, one test —
reads directly from its own React Query cache entry (`useCourseDetailsQuery`
for course metadata/sections/documents, `useLessonTestDraftQuery`/
`useSectionTestDraftQuery` for tests) and autosaves itself independently via
`useEntityAutosave` (`src/lib/use-entity-autosave.ts`), a small
debounced-save-then-reconcile hook wrapping that entity's own IPC mutation
(`useUpdateDraftMetadataMutation`, `useUpdateSectionMutation`,
`useUpdateLessonContentMutation`, `useSaveLessonTestMutation`/
`useSaveSectionTestMutation`). There is no reconciliation step between
entities, because there is nothing to reconcile — the query *is* the draft.
The editor status bar reflects this: "Saving…" comes from a single
`useIsMutating({ mutationKey: courseContentSaveMutationKey })` call in
`CourseLayout`, and the dirty/error half is forwarded up from whichever
entity is currently mounted via `useForwardAutosaveStatus`.

## Previewing a draft test

**Implemented.** A teacher must be able to verify a test behaves correctly for a
student *without* cutting or publishing a version — publishing is a real,
user-visible action (it changes what's distributed to students) and should
never be a side effect of "let me just check this."

The "Preview test" button in the test editor
(`src/components/test-editor-prototype.tsx`) navigates to a dedicated route,
`DraftTestPreviewPage` (`src/pages/draft-test-preview-page.tsx`, mounted at
`/drafts/:courseId/preview-test`) — the same page a student sees, not a
scaled-down modal summary of it, and not an overlay stacked on top of the
editor either (an earlier version was exactly that: a `fixed` full-screen
`<div>` sitting over the still-mounted editor form. It needed its own
print-specific CSS to behave, because a positioned overlay doesn't paginate —
Chromium clips it to one viewport-height box and bakes a scrollbar into the
print output instead of flowing content across physical pages. A real route
sidesteps that whole class of bug for free). The in-memory draft
(`TestEditorState`) and the tree node that was selected in the explorer
travel to the route via React Router's `navigate(path, { state })`, never
serialized to disk or a URL param — see `DraftTestPreviewLocationState` in
that file. It:

1. Converts the in-memory draft (`TestEditorState`) to a `SharedTestDefinition`
   via the same `toSharedTestDefinition` the real save path uses — no new
   conversion logic.
2. Resolves it to a single-locale `CourseTest` via
   `resolveSharedTestForPlayer` (`src/lib/exercise-kinds/registry.ts`) — the
   exact function `electron/course-registry.ts`'s real read path calls, so a
   preview and a published course resolve identically. This was extracted
   from that file specifically to make the preview possible without
   duplicating per-kind resolution logic.
3. Builds a synthetic "ready" `CoursePlayerReadyState`
   (`src/components/course-player/use-course-player.ts`) around that
   `CourseTest`, in place of the one `useCoursePlayer` would normally load
   from disk by `courseId`/`lessonId`.
4. Renders `TestPlayerView` (`src/components/test-player/test-player.tsx`) —
   the presentational half of the real `TestPlayer`, split out specifically
   so preview and the published route render identically: same header,
   print/interactive-mode hints, `CourseTestContent`, everything.
   `TestPlayer` itself is now just `useCoursePlayer` + `TestPlayerView`.

`CoursePlayerReadyState.exitPlayer` (normally "navigate to `/courses/:id`")
and `moveToNextLesson` (normally "go to the next lesson") both point at the
same "navigate back to `/drafts/:courseId`" callback here — there is no
course or next lesson to navigate to. That callback forwards the selected
tree node back through `navigate(path, { state })` too, so `CourseLayout`'s
`selectedNode` (see its own initializer) can restore it instead of resetting
to the course root — a real route means this whole layout actually unmounts
while the preview is open, unlike the old overlay, which just sat on top of
it without ever unmounting anything. `CoursePlayerActions`'s close button
takes that callback directly (`onClose`) rather than building a
`/courses/:id` link itself, which is what makes this substitution possible
without an `if (isPreview)` branch anywhere in the player.

Nothing in this path touches the filesystem: no version cut, no publish, no
save. Closing the preview discards the in-progress attempt. This is also the
practical way to exercise a new exercise kind's player-side behavior (answer
UI, grading) during development without publishing a throwaway course
version just to click through it as a "student."

## Inline exercise blocks

**Implemented**, as a narrower thing than the "inline quiz block" this
section originally proposed. Today there are three ways to get a gradable
exercise in front of a student: attached to a lesson (a whole test, derived
id, reached via that lesson's "Continue" button — see docs/contracts.md),
standalone (`CourseSectionTest`, its own section item, independent identity —
also docs/contracts.md), and now a single **exercise block** embedded
directly in a document's own content flow, alongside its other blocks (see
"BlockNote is an editing surface, not the format" in docs/contracts.md §4).
A document can hold any number of these, interleaved with prose, images, etc.

What actually got built is one exercise at a time, not a whole embedded
*test*: no blueprint/randomization, no strict-advancement setting, no
print mode, no "interactive vs. all-at-once" choice — a student just answers
it and checks it, right there in the document
(`src/components/editor-prototype/exercise-block.tsx`'s read-only branch).
It reuses each exercise kind's own `FieldsComponent`/`AnswerComponent`/
`grade()` unchanged, and persists via the same
`toSharedTestExerciseDefinition`/`fromSharedTestExerciseDefinition` a test's
exercises already use, inside its own `[matko-block]: <> (exercise)` marker
in the lesson's markdown (docs/contracts.md §4).

Because it's a single exercise rather than a whole test, it does **not**
make the lesson-attached test form redundant the way originally predicted —
a lesson-attached test's blueprint/randomization and multi-exercise flow are
still the only way to get those. The "test follows a document" sequencing
lesson-attached tests provide can still be had without them today, by
placing a standalone test node after the document node in the section's
explorer tree; that observation from the original note still stands, just
not as a reason this block type replaces anything.

## Previewing and committing a course from its draft editor

**Implemented.** The course-level page of the draft editor
(`src/pages/draft-detail-page.tsx`, the `selectedNode.id === courseRootId`
branch) has two page actions: **Preview course** and **Commit new version**.

"Preview course" is just a `<Link to={\`/courses/${courseId}\`}>` to the real,
read-only `CourseDetails` page — no new player-side code. This works because
`resolvePackageDirectoryCandidates()` (`electron/course-registry.ts`) always
prefers `draft/course.json` over a cut snapshot when both exist, so
`/courses/:courseId` and the real lesson/test player routes already
transparently serve live draft content for a personal (`distribution:
"local"`) course. A teacher previewing sees exactly what a student would see
if that draft were published right now — same components, same routes, no
synthetic state (contrast with "Previewing a draft test" below, which *does*
need synthetic state, because unsaved in-memory test content has no route to
serve it from).

"Commit new version" opens the existing `VersionHistoryDialog`
(`src/components/course-details/version-history-dialog.tsx`) — the same
dialog `course-details.tsx`'s "Version history" button opens — rather than
duplicating cut/publish/revert logic. It is disabled with a tooltip
("There are no changes on the course to commit.") whenever the course's
`versionBadge.kind` is `"version"` (draft is byte-identical to its last cut);
see "Version cutting" below for what that comparison actually does. The
badge is read from `CourseLayoutOutletContext.versionBadge`, populated by the
`useCourseDetailsQuery` call `CourseLayout` already makes for the explorer
sidebar — no second fetch.

A disabled `Button` sets `disabled:pointer-events-none`, which would also
block the `Tooltip` trigger's hover/focus events if applied directly. The fix
used here (and worth copying for the next disabled-button-with-tooltip case)
is wrapping the `Button` in a plain `<span>` and making that span the
`TooltipTrigger`'s `render` target — the span keeps pointer events, the
button inside it stays visually and functionally disabled.

## Learning vs. Teaching: distribution, not status

**Implemented.** The sidebar splits into two groups: **Learning** (Home —
attended courses) and **Teaching** (My courses — personal ones). The split is
`CourseManifest.distribution` (`"local" | "bundled"`), not `CourseStatus`
(`"draft" | "published"`) — the two look similar but answer different
questions, and only one of them matches what "Learning vs. Teaching" means:

- `status` lives in `draft/course.json` and reflects the *lesson content's*
  lifecycle. Publishing a version does **not** flip it — cutting one requires
  `status === "draft"` in the first place (see "Version cutting" below), so a
  course being actively authored stays `"draft"` in its own manifest forever,
  published or not. Filtering "My courses" by `status: "published"` (the old
  behavior) mostly just showed the bundled tutorial, not the courses a
  teacher was actually making.
- `distribution` answers "did I make this on this device, or did it arrive
  from somewhere else (bundled with the app; a future peer import)?" — see
  `CourseDistribution` in `src/lib/course-package.ts`. That is exactly the
  Learning/Teaching distinction. `CourseList` (`src/components/course-search/`)
  filters on it; Home passes `"bundled"`, the repurposed `my-courses-page.tsx`
  passes `"local"` and routes to `/drafts/:courseId` (the editor) instead of
  the read-only `/courses/:courseId`.

The old `/drafts` *listing* page is gone (it showed exactly the same set
`distribution: "local"` now shows under Teaching) — `/drafts/:courseId`, the
actual course editor, is untouched.

## Version cutting: draft vs. "vX.Y.Z" badge

**Implemented.** A personal course's card shows a **Draft** badge when its
current draft has changes beyond its most recently cut version, or the cut
version number (e.g. "0.2.0") when the draft is byte-identical to that cut —
see `CourseVersionBadge` in `src/lib/course-package.ts` and
`computeCourseVersionBadge` in `electron/course-registry.ts`.

This is a real content comparison, not a flag someone remembers to set: it
hashes every file under `draft/` and compares against the file hashes already
stored in the latest `versions/<x.y.z>/version-meta.json` (written by
`cutLocalCourseVersion` for its own hardlink-dedup optimization — reused here
for a second purpose). Two files are deliberately excluded from the
comparison: `course.json` (a cut always rewrites its `version`/`updatedAt`
into the draft *after* the snapshot's hashes were already computed, so its
hash can never match — that bug shipped once and was caught by
`e2e/app.e2e.mjs`'s "course version badge" suite) and `version-meta.json`
(only ever exists inside a `versions/` snapshot, never in `draft/`). Neither
says anything about whether course *content* changed.

A bundled course (`distribution: "bundled"`) has no `draft/` to diverge from
anything, so its badge is always `{ kind: "version" }`.

## Safety and corruption concerns

The main risk is not "files vs database". The real risk is unsafe write behavior.

To make file-backed drafts safe:

1. Use atomic writes.
2. Validate content before replacing files.
3. Add autosave.
4. Keep local snapshots or revision history for drafts. **Implemented**: `courses/<id>/versions/<major.minor.patch>/` holds immutable snapshots created by "cutting a version" (`electron/course-paths.ts`'s `cutLocalCourseVersion`); a draft can revert to a previous cut (`revertLocalCourseDraftToVersion`), and one cut version can be marked the published one via a `release.json` pointer (`publishLocalCourseVersion`) — see the version-history UI on the course details page. Unchanged files between cuts are hardlinked rather than duplicated (`copyDirectoryWithDedup`).
5. Store recovery metadata in the database.

## Write safety guidelines

When writing course files:

- write to a temporary file first
- validate before replacing the target
- replace files atomically
- avoid partial in-place writes

This reduces the chance of corrupting a draft if the app crashes during save.

## Recovery guidelines

The app should eventually support:

- last known good save tracking
- crash recovery markers
- local draft snapshots — **implemented**, see "Keep local snapshots or revision
  history for drafts" above
- restore from previous snapshot when a save fails — partially implemented:
  `recoverInterruptedDraftReplacements` (`electron/course-paths.ts`, run on every
  `ensureLocalCoursesRoot()`) self-heals a draft left mid-swap by a crashed
  `revertLocalCourseDraftToVersion` call, but there is no equivalent for a crash
  during ordinary lesson/section editing yet

## Architectural rule

Use this separation of concerns:

- Filesystem: canonical course content
- Database: canonical user/app state around course content

This model is the best fit for:

- future open source maintainability
- local-first authoring
- portable course packages
- future peer-to-peer sharing
