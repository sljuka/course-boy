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

## 4. Course packages on disk are a format, not an implementation detail

The layout under `courses/<course-id>/` is a contract between the reader
([electron/course-registry.ts](../electron/course-registry.ts:1)), the writer
([electron/course-paths.ts](../electron/course-paths.ts:1)), and the types in
`src/lib/course-package.ts`:

```
courses/<course-id>/course.json
courses/<course-id>/<section>/section.json
courses/<course-id>/<section>/<lesson>.json
courses/<course-id>/<section>/locales/<locale>/<lesson>.md
```

Per [docs/persistence-notes.md](persistence-notes.md:1) this format is also the future
sharing/publishing unit, so it is the same on-disk shape for drafts and published
courses. Changing it is a migration, not a refactor: existing course directories on
users' disks already use the current layout.

## 5. Design-system tier direction

`src/components/ui` is the bottom layer. It may import `@/lib/*`, `@/hooks/*`, and other
`@/components/ui/*` — never feature components or pages. Enforced by
`no-restricted-imports` in [.eslintrc.cjs](../.eslintrc.cjs:1).

Known leak: `src/components/ui/tag.tsx` imports `CourseTagColor` from
`@/lib/course-tags`, putting a domain concept inside the design system. Type-only, so
harmless today, but it is the direction that erodes the boundary.

## 6. Build output paths

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
