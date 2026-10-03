# CLAUDE.md

Matko is a **course sharing app** — an Electron desktop app for authoring, taking and
sharing courses — not just a local course player. Courses live on disk today; the
architecture is being taken peer-to-peer. Written to be maintained by outside
contributors after open sourcing, so favour clarity and explicitness over cleverness.

Stack: Electron 30 + Vite 5 + React 19 + TypeScript, Tailwind 4 with shadcn/base-ui
primitives, TanStack Query, i18next, `electron-store` for preferences, course packages as
files on disk.

## Commands

```sh
npm run dev          # Vite + Electron in development
npm run check        # typecheck + lint + test + i18n parity — the gate
npm run typecheck    # tsc --noEmit
npm run lint         # eslint, --max-warnings 0 (includes shadcn/no-restyle — see below)
npm test             # vitest run
npm run check:i18n   # locale key parity against en.json
npm run check:e2e    # vite build + real Electron app driven by Playwright (~1 min)
npm run check:packaged # electron-builder --dir (unsigned, unpublished) + checks the packaged app
npm run build        # tsc + vite build + electron-builder
```

`npm run check` is the definition of done for a change. It passes on a clean tree — if it
fails, that is your change.

`check:e2e` is deliberately **not** part of `check` (it needs a build and launches a real
app). Run it when you touch `electron/`, the preload bridge, onboarding, or i18n wiring.

`check:packaged` (~1 min) builds an unpacked, unsigned app into `release/` — a local
build, not a release — and checks what only packaging can break: files the app reads from
its own folder (`workers/`, `courses/`, `presets/`), asar staying off, and the Bare worker
starting outside the repo. Run it when you touch `electron-builder.json5`, dependencies,
the worker, or anything read from `APP_ROOT`.

Release builds come from `.github/workflows/release.yml`, never from a laptop: it builds on
one runner per OS (macOS arm64 and x64, Windows x64, Linux x64), because the Bare worker's
runtime binary is installed per platform by npm and a cross-built package ships the wrong
one. A `v<version>` tag matching `package.json` produces a *draft* GitHub Release; "Run
workflow" only builds. Builds are unsigned for now (SLJ-34).

`dependencies` holds only what loads from `node_modules` at runtime — the Bare worker's
imports and `bare-runtime` — because electron-builder ships every one of them. Anything Vite
bundles (all renderer libraries, and main-process ones like `electron-store`) is a
`devDependency`.

## Verifying in the real app

`npm run check` cannot verify the IPC contract — see contract 1 in
[docs/contracts.md](docs/contracts.md:1). Two ways to exercise the running app:

- **Interactive:** the `run-desktop` skill
  ([.claude/skills/run-desktop/SKILL.md](.claude/skills/run-desktop/SKILL.md:1)) — a REPL
  that launches Electron and gives you `ui` / `hit` / `fill` / `ipc` / `ss` against an
  isolated userData directory.
- **Automated:** `e2e/app.e2e.mjs` via `npm run check:e2e`. Sharing between app
  instances is `e2e/sharing.e2e.mjs`: a teacher and students as separate instances on a
  local DHT testnet (`MATKO_DHT_BOOTSTRAP`), never the public network.

Both share `e2e/launch.mjs`, so the REPL and the assertions behave identically. Prefer
adding a case to the e2e suite over one-off manual checking.

## Read before editing

- [docs/contracts.md](docs/contracts.md:1) — **read this before touching `electron/`,
  `src/lib/i18n.ts`, `src/locales/`, or the course package format.** Cross-file invariants
  where editing one side breaks the other silently. Most important: adding an IPC method
  is a four-file change, and `npm run typecheck` cannot catch getting it wrong.
- [docs/working-conventions.md](docs/working-conventions.md:1) — UI and component
  conventions. Design system first, composition over monoliths.
- [docs/persistence-notes.md](docs/persistence-notes.md:1) — read when making decisions
  about draft storage, publishing, local state, or sharing architecture.
- [docs/pear-integration-notes.md](docs/pear-integration-notes.md:1) — the planned
  peer-to-peer work. Phases 0–9 are built: `electron/bare-worker.ts` +
  `workers/main.cjs` spawn a Bare worker, derive and persist a Corestore-backed local
  identity keypair over `bare-rpc`, mirror a course's *published version* (see
  [docs/persistence-notes.md](docs/persistence-notes.md:1)) into a Hyperdrive
  (`publishCourse`, each course namespaced to its own key derived from the same root
  seed), can find a real peer and replicate a published course over Hyperswarm
  (`importCourse` — discovers the real course id from the fetched manifest, lands it as
  a root-only published course like the bundled seed, and keeps seeding for as long as
  the worker runs), and can gate a course to only vetted peers via a second Corestore
  plus `blind-pairing` invites (`publishGatedCourse` / `createInvite` / `redeemInvite`,
  driver-only for now). Publish is the share action (SLJ-38): publishing a version puts
  it online (unlisted, reachable only with the course's code, which never changes across
  versions), and `electron/course-sharing.ts` reshares published courses and follows
  imported ones at every startup. The code shows in the Publish confirmation and under
  "Share" (course editor and course page); the first Publish asks for the one-time
  sharing consent. "Import course" on My Courses takes a code. `source.json` in the drive records
  where a course is shared from. Students are offered newer versions of imported courses
  and apply them from the course page (SLJ-39); imported courses keep previous versions
  as `versions/<v>/` + `release.json`, and the student can go back (SLJ-40). No
  `pear-runtime`, no OTA updates of the app itself.

## Architecture rules

- **Process boundaries.** The renderer owns UI only — no filesystem, no network, no node
  built-ins. `electron/main.ts` owns files, course packages and preferences. When the Bare
  worker lands it will own everything peer-to-peer; the renderer must never reach past its
  bridge.
- **Filesystem is canonical for course content; the local database is canonical for
  user/app state.** Do not create a second representation of a course. See
  persistence-notes.
- **Course packages are portable.** Avoid coupling core course behaviour to device-local
  assumptions — the package format is the future sharing unit.
- **Writes must be safe:** write to a temp file, validate, replace atomically. Never
  partially overwrite a draft in place.
- **Design-system tiers.** `src/components/ui` is the bottom layer and may not import
  feature components or pages (enforced by `no-restricted-imports` in
  `eslint.config.mjs`). Visual styling — backgrounds, borders, shadows, radius,
  typography — belongs there, expressed as `cva` variants. Outside `ui`, styling should
  be layout/spacing-only (`flex`, `grid`, `gap`, sizing, padding) — enforced for real by
  `shadcn/no-restyle` in `eslint.config.mjs` (see its `contracts` array for which
  components' slots are allowed which additional categories, and why).
- **No user-facing strings in components.** All copy goes through i18next with a key in
  `src/locales/en.json`, mirrored into every other locale.

## Boundaries

You are assisting the maintainer, not substituting for them. When a task seems to require
an exception to something here, stop and surface the conflict rather than working around
it.

- ✅ **Always** run `npm run check` before reporting a change complete.
- ✅ **Always** update these docs when a change makes a descriptive statement in them
  false, and say so in your summary. Never rewrite a rule to legalise your own change.
- ⚠️ **Ask first:** new dependencies; Electron or build-tool changes; anything touching
  the course package format on disk (users already have course directories in the current
  layout); changes to the IPC surface.
- 🚫 **Never** run deployment or publishing commands — `pear stage`, `pear provision`,
  `pear multisig`, `pear seed`, `pear touch`, `electron-builder` releases, or pushing
  tags — unless explicitly asked for exactly that in this session.
- 🚫 **Never** enable `asar` once the Bare worker exists (it breaks worker spawning), and
  never commit keys or secrets.

## Known rough edges

Not blockers, but do not mistake them for patterns to copy:

- `electron/main.ts` redeclares `Category` / `UserRole` / `UserPreferences` locally instead
  of importing from `src/lib/preferences.ts`.
- `src/components/ui/sidebar.tsx` (~720 LOC) and `combobox.tsx` are far past the ~150 LOC
  guideline in working-conventions. They are vendored primitives; leave them unless the
  task is specifically to split them.
- **An exercise's `tags` are silently dropped at save time if they aren't registered in
  the course's `descriptiveTags`.** `buildDraftEditorSnapshot` in `draft-detail-page.tsx`
  filters every exercise's `tagIds`/blueprint rule down to tags present in the course's
  own descriptive-tag list before persisting — a tag set via a direct
  `window.courses.saveLessonTest`/`updateDraftMetadata` IPC call (bypassing the "Add tag"
  combobox, which registers new tags into `descriptiveTags` as a side effect) will pass
  the UI's own validation (which only checks `exercise.tagIds.length`, not
  cross-registration) yet still fail the backend's `hasValidTags` guard on save, since the
  tag gets stripped to `[]` first. Not a bug — it's what keeps an exercise from
  referencing a tag that doesn't exist — but it is easy to misdiagnose as a save-pipeline
  bug when constructing test fixtures or IPC calls by hand instead of going through the
  real tag-picker UI.
- **Hardcoded English literals slip past `check:i18n`**, which only compares key parity
  between locale files. The vendored `SidebarTrigger`/`SidebarRail` in
  `src/components/ui/sidebar.tsx` still contain a literal "Toggle Sidebar" but are no
  longer rendered (the toggle moved to the window title bar); `e2e/app.e2e.mjs` asserts
  the string never reappears on screen. Several remain in the `*-prototype`
  components (e.g. the explorer's "Test" node label). An `i18next/no-literal-string`
  eslint rule would catch the whole class.
- No Content-Security-Policy is set, so Electron logs a warning on every launch. Exposure
  is still low for most content — `react-markdown` runs without `rehype-raw` — but the
  `region-picker` exercise kind (`src/components/region-picker-canvas.tsx`) is now a real
  exception: it renders an uploaded SVG's raw markup inline via `dangerouslySetInnerHTML`
  so individual shapes can be clicked, sanitizing with `DOMPurify` (SVG profile, plus a
  hook stripping non-fragment/non-`data:` `href`/`xlink:href` values) immediately before
  every render. That sanitization is the one mitigation in place; general CSP hardening
  for the rest of the app is still open, and matters more once peer-imported course
  content (not just local uploads) reaches this or a future kind.
- The `*-prototype` components (`editor-prototype`, `course-structure-prototype`,
  `test-editor-prototype`) are exploratory and hold most of the styling violations.
