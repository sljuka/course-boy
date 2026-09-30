# Contracts

> Cross-file invariants where editing one side breaks the other, **often silently**.
> Everything here is verified against the code, not aspirational. If you change one
> item in a list, change all of them in the same commit.
>
> Index: [CLAUDE.md](../CLAUDE.md:1)

## 1. Adding or changing an IPC method touches four files

There is no generated glue between the main process and the renderer. Every method on
`window.courses` / `window.preferences` exists in four independent places:

| # | File | What lives there |
|---|------|------------------|
| 1 | [electron/main.ts](../electron/main.ts:1) | `ipcMain.handle('courses:list', ...)` — the channel string and the real implementation |
| 2 | [electron/preload.ts](../electron/preload.ts:1) | `ipcRenderer.invoke('courses:list', ...)` — the **same** channel string |
| 3 | [electron/preload.ts](../electron/preload.ts:1) | `contextBridge.exposeInMainWorld('courses', {...})` — the `window` key and method name |
| 4 | [electron/electron-env.d.ts](../electron/electron-env.d.ts:25) | `interface Window { courses: { ... } }` — the hand-written type the renderer sees |

**Why this is a silent-failure contract, not just repetition:**

- Channel strings are plain strings on both sides. A typo in one is not a type error —
  `ipcRenderer.invoke` on an unregistered channel rejects at runtime only.
- `preload.ts` asserts its return types with `as Promise<CourseSummary[]>`. That is an
  unchecked assertion: if the handler in `main.ts` returns a different shape, TypeScript
  reports nothing, on either side. The renderer gets wrong data typed as right data.
- `electron-env.d.ts` is a hand-maintained mirror of `preload.ts`. Nothing verifies the
  two agree. A method can be present in the `.d.ts` and absent from the bridge — the
  renderer then compiles cleanly and throws `undefined is not a function` at runtime.

So: `npm run typecheck` passing tells you nothing about whether an IPC change is
correct. Exercise the path in the running app.

## 2. Shared types cross the process boundary by import, not by duplication

`electron/main.ts` and `electron/preload.ts` both import types from `src/`:

- `src/lib/course-package.ts` — `CourseSummary`, `CourseDetails`, and the
  `Create*Input` / `Update*Input` shapes
- `src/lib/i18n.ts` — the `Locale` union
- `src/lib/preferences.ts` — `UserPreferences`

Keep these **type-only** imports. Importing a runtime value from `src/` into the main
process pulls renderer code (and eventually DOM APIs) into a Node context. Note that
`main.ts` currently redeclares its own local `Category` / `UserRole` / `UserPreferences`
rather than importing them from `src/lib/preferences.ts` — that duplication is a live
drift risk, not a pattern to copy.

## 3. Locale key sets must match exactly

- `src/locales/en.json` is the source of truth (226 keys).
- `sr.json` and `sr-Cyrl.json` must have the **identical** key set — no missing keys, no
  orphans.
- The `locales` array in [src/lib/i18n.ts](../src/lib/i18n.ts:22) must list every file in
  `src/locales/`, and its `Locale` type is what `main.ts` and `preload.ts` accept.
- `detectLocale()` in the same file needs a matching branch per locale, and adding a
  locale means adding a `resources` entry too.

Enforced by `npm run check:i18n`. Adding a locale is therefore a five-place change:
JSON file, `locales` array, `resources` map, `detectLocale()` branch, and
`src/lib/locale-flags.ts`.

## 4. Lesson block markers are a hand-maintained allowlist, not a type

[src/lib/lesson-content-markdown.ts](../src/lib/lesson-content-markdown.ts:1) serializes
each `EditorPrototypeBlock` as a `[matko-block]: <> (type)` CommonMark link-reference
line followed by the block's body, and `markdownToBlocks` parses a lesson's stored
markdown back into blocks by matching that marker against `blockMarkerPattern`:

```ts
const blockMarkerPattern =
  /^\[matko-block\]: <> \((heading|markdown|image|video|audio|exercise)\)$/;
```

This `EditorPrototypeBlock[]` model (not BlockNote's own block JSON) is still the
canonical, on-disk representation of a lesson's content — see "BlockNote is an editing
surface, not the format" below. `serializeBlock`/`parseBlockContent`'s switches over
`EditorPrototypeBlockType` have no `default` case, so TypeScript forces every block type
to be handled there — but `blockMarkerPattern` is a plain regex string, not checked
against the union. Add a new block type, forget to add its name to `blockMarkerPattern`'s
alternation, and there is no compile error: the marker line for that block simply never
matches, `markdownToBlocks` falls through to its "no markers found" fallback, and the
entire lesson body — every block, not just the new one — collapses into a single opaque
markdown block. `npm run typecheck` and `npm run lint` both pass; only
`src/lib/lesson-content-markdown.test.ts`'s round-trip tests catch it, so extend those
tests in the same commit that adds a block type. The same is true, separately, of
`blockNoteBlocksToEditorPrototype`'s if-chain in
[blocknote-translation.ts](../src/components/editor-prototype/blocknote-translation.ts:1)
— its "everything else becomes a markdown run" fallback means a forgotten case there
degrades silently too, rather than failing to compile.

### BlockNote is an editing surface, not the format

[BlockNote](https://www.blocknotejs.org) is the document editor's UI (both for authoring,
`src/components/draft-details/draft-document-editor.tsx`, and for the student-facing
lesson view, `src/components/course-player/lesson-blocks.tsx` — the same component,
`editable={true}` vs `editable={false}`). It is never used for persistence: BlockNote's
own markdown import/export was tested and found to flatten a custom block (the exercise
block below) into unrecoverable plain text on export, so
[blocknote-translation.ts](../src/components/editor-prototype/blocknote-translation.ts:1)
translates directly between BlockNote's block JSON and `EditorPrototypeBlock[]` — the
`markdown` block type is the one exception, using BlockNote's own conversion as a purely
local, in-memory shape-conversion helper for a contiguous run of "everything that isn't
one of our other structurally-recognized types," never touching disk in that form.

A custom block registered in
[blocknote-schema.ts](../src/components/editor-prototype/blocknote-schema.ts:1) does not
automatically get a slash-menu entry or appear as a valid `render` prop shape the way the
docs imply — see the `exercise` block
([exercise-block.tsx](../src/components/editor-prototype/exercise-block.tsx:1)) for the
two gotchas found building it: `render` must be defined via `createReactBlockSpec` (from
`@blocknote/react`), not `createBlockSpec` (from `@blocknote/core`, which expects a raw
DOM-node-returning function, not JSX) — and the editor instance is obtained via the
`useBlockNoteEditor()` hook from inside the rendered component, not passed as a `render`
prop, despite what the hosted docs suggest. Its own slash-menu item is appended manually
in `draft-document-editor.tsx` via `SuggestionMenuController`.

The exercise block ([docs/persistence-notes.md](persistence-notes.md:1)'s "Inline
exercise blocks" section) reuses the exact `TestExercise` shape and
`toSharedTestExerciseDefinition`/`fromSharedTestExerciseDefinition` a test's own exercises
already use — see "Adding an exercise kind" below for that machinery — so it inherits
every kind's `FieldsComponent`/`AnswerComponent`/`grade()` unchanged. It branches its own
rendering on `useBlockNoteEditor().isEditable` rather than being a genuinely different
component per role.

## 5. Course packages on disk are a format, not an implementation detail

The layout under `courses/<course-id>/` is a contract between the reader
([electron/course-registry.ts](../electron/course-registry.ts:1)), the writer
([electron/course-paths.ts](../electron/course-paths.ts:1)), and the types in
`src/lib/course-package.ts`:

Courses live at `app.getPath('userData')/courses` at runtime — **not** in the repo's
`courses/` directory, which is the bundled seed copied in on first run
(`bundledSeedCourseIds` in `course-paths.ts`, tracked by
`courses/.bundled-seed-state.json`).

```
courses/<course-id>/course.json                              # published manifest
courses/<course-id>/<section>/section.json
courses/<course-id>/<section>/<lesson>.json
courses/<course-id>/<section>/<test>.json                    # optional, one per lesson
courses/<course-id>/<section>/<section-test>.json             # optional, standalone — no parent lesson
courses/<course-id>/<section>/locales/<locale>/<lesson>.md
courses/<course-id>/assets/<filename>                         # course-level, referenced by filename only
courses/<course-id>/draft/course.json                        # draft manifest
courses/<course-id>/draft/<section>/...
courses/<course-id>/draft/assets/<filename>
```

`assets/` holds uploaded images/video/audio at the course level (not per-lesson/section) —
`uploadLocalCourseAsset` in `course-paths.ts` only ever writes under `draft/assets/`, since
writers require `status === "draft"`. `uploadCourseAssetFromBytes` is the sibling used for
BlockNote's own "Upload from device" file input in the document editor (a `File` the
renderer already has, not a path for the main process to open its own dialog for) — same
validation, same `draft/assets/` destination, different entry point. Reads have to go through
`resolvePackageDirectoryCandidates()` (the same draft-then-published fallback used for
manifests) because the *player* can be viewing a published course while the *editor* only
ever needs the draft. Blocks store the filename only — no `assets/` prefix — and the
renderer never touches the filesystem directly; the `matko-asset://<courseId>/<filename>`
protocol registered in `electron/main.ts` resolves and streams the file, rejecting any
filename containing `/`, `\`, or `..` via `resolveAssetFilename()` in
[src/lib/course-asset-id.ts](../src/lib/course-asset-id.ts:1) before it ever reaches the
filesystem.

Asset filenames are **content-addressed**: `<slug-of-original-name>-<first 16 hex of the
file's sha256>.<ext>` (`createAssetFilename`). Assets are never edited after upload, so
uploading bytes the draft already holds — even under another original name — reuses the
existing file instead of storing a second copy (`storeCourseAsset` in `course-paths.ts`).
Older random-suffix names (`<slug>-<8 random chars>.<ext>`) stay valid; they're just not
deduplicated.

A cut version contains **only the assets its content references**: an asset counts as
referenced when its filename appears anywhere in the package's `.json`/`.md` text
(`getCourseAssetUsage` in `electron/course-asset-usage.ts`; `version-meta.json` excluded,
since it lists every path). The draft-vs-version badge ignores unreferenced assets for
the same reason. **After a successful cut, unreferenced assets are deleted from
`draft/assets/`** (`removeUnusedDraftAssets`; never from `versions/` — an older version
that still uses a file keeps its own hardlinked copy, and reverting to it brings the file
back). The cut dialog lists them first via `courses.getUnusedDraftAssets(courseId)`. Not
done on every edit: an abandoned upload or the editor's undo can still bring a reference
back before the next cut.

**Draft files are replaced, never edited in place.** Cut hardlinks files from the draft
into the version, and revert hardlinks them back, so a draft file and a version file can
share one inode. Every writer goes through `writeFileAtomic`/`copyFileAtomic`/
`storeCourseAsset` (write a temp file, then rename), which gives the draft a new inode and
leaves the version untouched. A write that truncates an existing draft file in place
(`fs.writeFile` on an existing path, or an external editor that saves in place) would
silently change every version hardlinked to it.

That handler must answer a `Range` request with a real `206 Partial Content` (status,
`Content-Range`, `Content-Length`, read via `fs/promises`' `open`/`read` at the requested
offset) rather than the plain `200` `net.fetch(pathToFileURL(...))` returns on its own —
`net.fetch` does quietly honor an incoming `Range` header for a `file://` URL by slicing
the body, but without relabeling the response as `206`, and a `<video>` element then
throws `MEDIA_ELEMENT_ERROR: Format error` and refuses to play at all, rather than falling
back to reading the mislabeled body as a whole file. This isn't a rare edge case: an
unedited screen recording (`.mov`) routinely has its `moov` atom written after `mdat`, so
the player needs a real byte-range read to find it before it can play anything, not just
to support seeking within an already-playing video.

A test file is a sibling of the lesson it belongs to, in the same section directory, with
its filename fully derived from the lesson's: `lesson-01-foo.json` pairs with
`test-01-foo.json`. This derivation (`resolveTestIdForLesson` /
`resolveLessonIdForTest` in [src/lib/course-test-id.ts](../src/lib/course-test-id.ts:1)) is
the only thing that ties a test to its lesson — there is no `testId` field stored
anywhere, and a test has no independent identity or title. A lesson without a test simply
has no `test-XX-*.json` file; `CourseLesson.test` is `null` in that case.

A **standalone test** (`CourseSectionTest` in
[src/lib/course-package.ts](../src/lib/course-package.ts:1)) is the other, independent way a
section can hold a test — no parent lesson, no document, its own real identity. Its file,
`section-test-XX-slug.json`, is distinct from the `test-XX-*` naming above precisely so a
directory scan can tell the two apart by filename alone, with no dependence on file
*absence* to infer meaning. Unlike a lesson/test pair, there's no document to justify
splitting metadata from content, so one file carries both: it's created with only
`id`/`slug`/`locales` (so the explorer tree has something to select before a single
exercise exists), then gains `template`/`exercises`/`structure` once the author saves —
`CourseSectionTest.test` is `null` until then. This is additive: existing courses' `lesson`/
`test` file pairs are untouched, read and written through the exact same paths they always
were.

**Course ids are opaque and random**: 16 lowercase base32 characters (`a–z`, `2–7`),
80 random bits, created by `createCourseId` in
[src/lib/course-id.ts](../src/lib/course-id.ts:1). The id is the course folder name,
the namespace its share drive key is derived from (`course-${courseId}` in the Bare
worker), and part of `matko-asset://` URLs, so it never changes after creation. The
title lives only in `course.json` and changes freely; `course.json`'s `slug` is a
readable leftover of the title at creation, never used as an identifier. Every entry
point checks `isValidCourseId` before an id reaches a path: the main-process path
helpers (`resolveCourseRootPath` / `resolveCourseDirectoryPath` in `course-paths.ts`),
the `matko-asset://` handler, version history, sharing, and the Bare worker's import
(`workers/course-id.cjs`, which mirrors the pattern — its test asserts the two agree).
Ids used to be title slugs; on the first launch after the change,
`removeLegacyIdCourses` deleted every course folder with a non-conforming name, once,
and the bundled course was re-seeded under its new id (`thys2vej6my5mpxt`).

Drafts live in a `draft/` subdirectory of the course root, so one course id can hold both
a published version and an in-progress draft. Writers resolve it via
`getDraftDirectoryPath()`; the draft manifest carries `status: "draft"` and every mutation
rejects if the manifest says otherwise.

Per [docs/persistence-notes.md](persistence-notes.md:1) this format is also the future
sharing/publishing unit, so drafts and published courses use the same package shape.
Changing it is a migration, not a refactor: existing course directories in users'
`userData` already use the current layout.

`course.json` carries **no `publisher` and no `distribution`** (removed 2026-09-28).
Where a course was published from — its share address and the publisher's creator key —
goes in a `source.json` the Bare worker writes next to a version when sharing it (SLJ-9,
not built yet). Whose course it is *on this device* is never stored in the package, since
the same package is authored on one machine and imported on another:
`resolveCourseDistribution` in
[electron/course-registry.ts](../electron/course-registry.ts:1) derives
`CourseSummary.distribution` from the folder layout — a `draft/` means `"local"` (My
courses), the bundled seed id means `"bundled"`, anything else is `"imported"` (both
listed on Home). A leftover `distribution` field in an older or peer-supplied
`course.json` is ignored.

## 6. Design-system tier direction

`src/components/ui` is the bottom layer. It may import `@/lib/*`, `@/hooks/*`, and other
`@/components/ui/*` — never feature components or pages. Enforced by
`no-restricted-imports` in [eslint.config.mjs](../eslint.config.mjs:1).

`src/components/ui/tag.tsx` owns the canonical tag color palette as its `cva` variant
keys (`TagColor`, derived via `VariantProps`); `src/lib/course-tags.ts`'s `CourseTagColor`
is a type alias of it. This is the correct direction — the domain type narrows to what the
design-system primitive supports, not the reverse — so it's not a tier violation despite
`lib` importing from `ui`; the restriction only runs the other way.

## 7. Build output paths

- `package.json#main` is `dist-electron/main.js`.
- `vite.config.ts` decides that path via `vite-plugin-electron` entries
  (`electron/main.ts`, `electron/preload.ts`).
- `electron-builder.json5#files` lists `dist` and `dist-electron`.
- `main.ts` computes `APP_ROOT`, `MAIN_DIST` and `RENDERER_DIST` from `__dirname`
  relative to that output layout, and `createWindow()` loads
  `preload.mjs` — note the extension differs from the `.js` in `package.json#main`.

Changing the build tool means changing all four together. This is the contract the
planned electron-forge migration breaks first.

## 8. Adding an exercise kind touches two files (plus the shapes it needs)

Lesson tests support multiple exercise kinds (`numeric`, `multiple-choice`,
`word-types`, ...), dispatched through two small registries instead of hand-written
`if/else` chains, split exactly at the process boundary from contract 2 above:

| Registry | File | Used by |
|---|---|---|
| Pure runtime | [src/lib/exercise-kinds/registry.ts](../src/lib/exercise-kinds/registry.ts:1) | `electron/course-registry.ts` (save-time structural guard, read-time locale collapsing), `course-player-utils.ts` (per-attempt instance building), `use-test-player-state.ts` (grading) |
| Renderer editor | [src/components/exercise-kinds/registry.ts](../src/components/exercise-kinds/registry.ts:1) | the "Add exercise" menu, the exercise card's field dispatch, draft↔shared persistence conversion, the player's answer/print-answer UI |

Both registries are typed `Record<ExerciseKind, ...>` (not an array + `.find`) so that
adding a value to the `ExerciseKind` union in
[src/lib/course-package.ts](../src/lib/course-package.ts:1) without registering it in
**both** registries is a compile error, not a silent fallthrough to numeric handling.

To add a kind:

1. Add the literal to `ExerciseKind` and write its three shapes in `course-package.ts`
   (player-facing `CourseExercise` member, on-disk `SharedTestExerciseDefinition`
   member) — these intentionally stay three separate, hand-written shapes (player /
   disk / draft-editor) rather than one unified type; see `src/components/
   test-editor-prototype-types.ts` for the third (draft) shape.
2. Create `src/lib/exercise-kinds/<kind>.ts` implementing `ExerciseKindRuntime`
   (`isValid`, `resolveForPlayer`, `buildInstance`, `grade`) — pure, no React, no
   filesystem, safe to import from Electron main.
3. Create `src/components/exercise-kinds/<kind>.tsx` implementing `ExerciseKindEditor`
   (`createExercise`, `validate`, `toShared`/`fromShared`, `FieldsComponent`,
   `AnswerComponent`, optional `PrintAnswerComponent`) — register it in both
   registries.

A kind with no `PrintAnswerComponent` simply never renders in the print pass — that is
the mechanism behind "multiple-choice and word-types are interactive-only."

`grade()` returns a plain `{isCorrect} | {isCorrect: false, isAnswered, ...}` result and
never calls `t(...)` — hint-formatting and translation are centralized once in
`use-test-player-state.ts` rather than duplicated per kind.

Every kind requires at least one tag to save — `hasValidTags` in the runtime registry
enforces it at save time, but a kind's editor-side `validate()` must call the matching
`validateHasTags()` from `src/components/exercise-kinds/types.ts` itself (last, after any
kind-specific checks) or the UI can show "Valid" for an exercise the backend then
rejects with no visible reason. This was a real bug for numeric specifically: it validated
its formula but never checked for tags, while multiple-choice and word-types did.

Both registries type their entries as `ExerciseKindRuntime<any, any>` /
`ExerciseKindEditor<any, any, any>` — a deliberate, narrow loss of per-kind type
precision at the registry boundary itself (an eslint-disable comment marks each spot).
Each kind's own module still gets full type safety internally; only code that looks a
kind up generically (rather than importing it directly) sees the erased type.

## 9. The app frame: title bar, sidebar, status bar, and the page card

The native title bar is hidden (`titleBarStyle: 'hidden'` in
[electron/main.ts](../electron/main.ts:1)). The window is one fixed-height frame,
`AppShell` ([src/components/ui/app-shell.tsx](../src/components/ui/app-shell.tsx:1)):
title bar row (`AppTitleBar`) → main row (the route layout) → status bar row
(`AppFrameStatusBar`), all on the sidebar background. The route layout puts the page in a
rounded card, `PagePanel` ([src/components/ui/page-panel.tsx](../src/components/ui/page-panel.tsx:1)),
and **only the page's `PageBody` scrolls** — the window never does. Rules that span files:

- **Title bar height.** `titleBarOverlay.height` (Windows/Linux) and `trafficLightPosition`
  (macOS, centred in the bar) in `main.ts` must match `--app-titlebar-height` in
  [src/index.css](../src/index.css:1). The desktop sidebar container is `fixed` between
  `--app-titlebar-height` and `--app-statusbar-height`, so both variables must stay the
  real heights of those rows.
- **Pages render inside `PagePanel` and scroll only through `PageBody`.** Use `<Page>`
  ([src/components/page/page.tsx](../src/components/page/page.tsx:1)), which adds the
  toolbar and the `PageBody`. Nothing should size itself to `100vh`/`min-h-screen` or use
  `position: sticky` against the window: the window doesn't scroll, so those do nothing
  or overflow. Full height inside the main row is `min-h-0 flex-1`.
- **Printing undoes all of it.** `html/body/#root` are only clamped to the window height
  under `@media screen`; `AppShell`, `PagePanel`, `PageBody` and `Page`'s column carry
  `print:` resets (no fixed height, no overflow clipping, no margins/radius/border/
  background, no width cap), and the title bar, status bar and page toolbar are
  `print:hidden`. A new wrapper between the shell and the content needs the same resets,
  or printing outputs only what fits in the card. Checked by printing a long lesson and a
  test to PDF (`webContents.printToPDF`) and comparing page counts.
- **Anything drawn over the title bar must opt out of dragging.** The bar is a
  `-webkit-app-region: drag` region, and Electron gives drag regions priority over
  overlapping elements, so clicks in the top 42px of an overlay would move the window
  instead. `ui/dialog.tsx` and `ui/sheet.tsx` carry `[-webkit-app-region:no-drag]` on
  their overlays and popups; a new full-screen overlay needs the same. Clickable
  controls inside the bar go in `WindowTitleBarGroup`, which does this for them.
- **Frame slots filled from inside a layout.** The title bar and status bar sit outside
  every route layout. The sidebar toggle reaches the mounted layout's `SidebarProvider`
  through `RegisterTitleBarSidebarToggle` (`src/lib/use-title-bar-sidebar.ts`) — a new
  layout with a sidebar must render it inside its provider, or the button stays disabled.
  A layout puts content at the end of the status bar with `AppStatusBarEnd` (a portal;
  `src/lib/use-app-status-bar.ts`), as `CourseLayout` does for the editor's save status.
- **Layout-owned page slots.** The course editor is one route whose "pages" are explorer
  selections, so its layout supplies what every editor page shares: the breadcrumb trail
  (`LayoutBreadcrumbsContext`) and its in-page side panels (`PageSidePanelsContext`,
  `src/lib/use-page-side-panel.ts`): `left` is the explorer, `right` the course's
  Versions. `<Page>` renders each beside its `PageBody` (a drawer on narrow windows,
  see below) and its toggle at that end of the page's second row, the `PageActionBar` — the first
  row (`PageToolbar`) is breadcrumbs only. Each panel's open state persists in the
  preferences store (`explorerPanel`, `versionsPanel`), both validated in `main.ts` by
  `parseExplorerPanelPreference`; a new panel needs its key in `UserPreferences` on
  both sides and in that validation.
- **Narrow windows turn the frame's side parts into drawers** (SLJ-26). Below
  `SIDE_PANELS_INLINE_MIN_WIDTH` (1280px) the editor's panels, and below
  `APP_SIDEBAR_INLINE_MIN_WIDTH` (1024px) the app sidebar, render as sheets that start
  closed (`src/hooks/use-mobile.ts`). A drawer's open state is its own: opening or
  closing it never writes the saved inline state (`explorerPanel`, `versionsPanel`, the
  sidebar's `open`), so widening the window restores the saved layout. A panel closes
  when its `dismissKey` changes (the explorer passes its selection); the app sidebar's
  drawer closes on navigation. Text buttons in the action bar turn icon-only below the
  same 1280px through the `compact` CSS variant (`src/index.css`) — keep its width in
  sync with `SIDE_PANELS_INLINE_MIN_WIDTH`. The main window opens at up to 1440×900
  (capped to the screen) so a first launch starts with everything inline; Electron's
  default 800×600 would start with all three as drawers.
- **The whole frame waits for app state.** `AppFrame` in `src/App.tsx` renders nothing
  until preferences have loaded, so the first thing in `#root` is the page the app starts
  on — the e2e launch helper treats "something mounted in `#root`" as ready.
- **Dark mode.** The frame (`--sidebar`) is darker than the page card (`--background`),
  like Linear; flipping them back would draw a light frame around a dark card.

## Third-party extensions (not yet built)

Raised as a "could we do a VSCode-style extension model?" question, not yet designed or
built. The cheapest real entry point is contract 8 above: the exercise-kind registries
are already shaped like an internal plugin system (a fixed `ExerciseKindRuntime` /
`ExerciseKindEditor` interface, dispatched by kind rather than hand-written
`if`/`else`), so the first extension point worth building is letting a kind be
registered from outside the app bundle instead of only from a file compiled into it —
**not** a general VSCode-style contribution-point API surface (commands, views,
languages, ...) across the whole app.

The blocking design question is trust, not mechanism: `ExerciseKindRuntime` is
explicitly meant to be safe to import from Electron main (contract 8 again — "pure, no
React, no filesystem"), and `ExerciseKindEditor` renders directly into the app's own
renderer process with no sandboxing today. A third-party kind is arbitrary code
running with at least renderer-level trust, which is a materially bigger surface than
the one deliberate exception to "no untrusted content execution" that already exists
(`region-picker-canvas.tsx`'s DOMPurify-sanitized inline SVG, see the CLAUDE.md rough
edges list) — and it gets more important once P2P course import
([pear-integration-notes.md](pear-integration-notes.md:1)) means a course (and
conceivably the extension it depends on) can arrive from a peer instead of a local
install. Any real design here needs to answer where an extension actually runs
(sandboxed renderer context? a separate process, mirroring VSCode's Extension Host?)
and what it's allowed to touch (just its own exercise kind's grading/UI, or course
files, or more) before any loader code gets written.

## Not yet contracts

The Pear/Bare boundaries (worker spawn argv order, FramedStream pipe strings, the
`package.json#imports` map for Bare builtins) do not exist in this repo yet. The
verified upstream facts are recorded in
[pear-integration-notes.md](pear-integration-notes.md:1); move them here as they become
real code.
