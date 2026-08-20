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
const blockMarkerPattern = /^\[matko-block\]: <> \((heading|markdown|image|video|audio)\)$/;
```

`createPrototypeBlock`'s switch over `EditorPrototypeBlockType` has no `default` case, so
TypeScript forces every block type to be handled there — but `blockMarkerPattern` is a
plain regex string, and [editor-prototype.tsx](../src/components/editor-prototype/editor-prototype.tsx:1)'s
`blockTypes` array (which drives the insert menu) is a plain array literal. Neither is
checked against the `EditorPrototypeBlockType` union. Add a new block type, forget to add
its name to `blockMarkerPattern`'s alternation, and there is no compile error: the marker
line for that block simply never matches, `markdownToBlocks` falls through to its
"no markers found" fallback, and the entire lesson body — every block, not just the new
one — collapses into a single opaque markdown block. `npm run typecheck` and `npm run
lint` both pass; only `src/lib/lesson-content-markdown.test.ts`'s round-trip tests catch
it, so extend those tests in the same commit that adds a block type.

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
courses/<course-id>/<section>/locales/<locale>/<lesson>.md
courses/<course-id>/assets/<filename>                         # course-level, referenced by filename only
courses/<course-id>/draft/course.json                        # draft manifest
courses/<course-id>/draft/<section>/...
courses/<course-id>/draft/assets/<filename>
```

`assets/` holds uploaded images/video/audio at the course level (not per-lesson/section) —
`uploadLocalCourseAsset` in `course-paths.ts` only ever writes under `draft/assets/`, since
writers require `status === "draft"`. Reads have to go through
`resolvePackageDirectoryCandidates()` (the same draft-then-published fallback used for
manifests) because the *player* can be viewing a published course while the *editor* only
ever needs the draft. Blocks store the filename only — no `assets/` prefix — and the
renderer never touches the filesystem directly; the `matko-asset://<courseId>/<filename>`
protocol registered in `electron/main.ts` resolves and streams the file, rejecting any
filename containing `/`, `\`, or `..` via `resolveAssetFilename()` in
[src/lib/course-asset-id.ts](../src/lib/course-asset-id.ts:1) before it ever reaches the
filesystem.

A test file is a sibling of the lesson it belongs to, in the same section directory, with
its filename fully derived from the lesson's: `lesson-01-foo.json` pairs with
`test-01-foo.json`. This derivation (`resolveTestIdForLesson` /
`resolveLessonIdForTest` in [src/lib/course-test-id.ts](../src/lib/course-test-id.ts:1)) is
the only thing that ties a test to its lesson — there is no `testId` field stored
anywhere, and a test has no independent identity or title. A lesson without a test simply
has no `test-XX-*.json` file; `CourseLesson.test` is `null` in that case.

Drafts live in a `draft/` subdirectory of the course root, so one course id can hold both
a published version and an in-progress draft. Writers resolve it via
`getDraftDirectoryPath()`; the draft manifest carries `status: "draft"` and every mutation
rejects if the manifest says otherwise.

Per [docs/persistence-notes.md](persistence-notes.md:1) this format is also the future
sharing/publishing unit, so drafts and published courses use the same package shape.
Changing it is a migration, not a refactor: existing course directories in users'
`userData` already use the current layout.

The generated manifest carries `publisher: { id: "matko", displayName: "matko" }` and
`distribution: "local"` as placeholders. Those are the fields the peer-to-peer work has to
fill with a real publisher key — see
[pear-integration-notes.md](pear-integration-notes.md:1).

## 6. Design-system tier direction

`src/components/ui` is the bottom layer. It may import `@/lib/*`, `@/hooks/*`, and other
`@/components/ui/*` — never feature components or pages. Enforced by
`no-restricted-imports` in [.eslintrc.cjs](../.eslintrc.cjs:1).

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

## Not yet contracts

The Pear/Bare boundaries (worker spawn argv order, FramedStream pipe strings, the
`package.json#imports` map for Bare builtins) do not exist in this repo yet. The
verified upstream facts are recorded in
[pear-integration-notes.md](pear-integration-notes.md:1); move them here as they become
real code.
