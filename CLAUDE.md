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
npm run check        # typecheck + lint + test + i18n parity + styling ratchet — the gate
npm run typecheck    # tsc --noEmit
npm run lint         # eslint, --max-warnings 0
npm test             # vitest run
npm run check:i18n   # locale key parity against en.json
npm run check:styles # visual styling outside src/components/ui must not grow
npm run check:e2e    # vite build + real Electron app driven by Playwright (~15s)
npm run build        # tsc + vite build + electron-builder
```

`npm run check` is the definition of done for a change. It passes on a clean tree — if it
fails, that is your change.

`check:e2e` is deliberately **not** part of `check` (it needs a build and launches a real
app). Run it when you touch `electron/`, the preload bridge, onboarding, or i18n wiring.

## Verifying in the real app

`npm run check` cannot verify the IPC contract — see contract 1 in
[docs/contracts.md](docs/contracts.md:1). Two ways to exercise the running app:

- **Interactive:** the `run-desktop` skill
  ([.claude/skills/run-desktop/SKILL.md](.claude/skills/run-desktop/SKILL.md:1)) — a REPL
  that launches Electron and gives you `ui` / `hit` / `fill` / `ipc` / `ss` against an
  isolated userData directory.
- **Automated:** `e2e/app.e2e.mjs` via `npm run check:e2e`.

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
  peer-to-peer work. Phases 0–6 are built: `electron/bare-worker.ts` +
  `workers/main.cjs` spawn a Bare worker, derive and persist a Corestore-backed local
  identity keypair over `bare-rpc`, mirror a course's *published version* (see
  [docs/persistence-notes.md](docs/persistence-notes.md:1)) into a Hyperdrive
  (`publishCourse`, each course namespaced to its own key derived from the same root
  seed), can find a real peer and replicate a published course over Hyperswarm
  (`importCourse` — discovers the real course id from the fetched manifest, lands it as
  a root-only published course like the bundled seed, and keeps seeding for as long as
  the worker runs), and can gate a course to only vetted peers via a second Corestore
  plus `blind-pairing` invites (`publishGatedCourse` / `createInvite` / `redeemInvite`,
  driver-only for now). A real `window.sharing` IPC surface and Share/Import UI (public
  link only; gated UI is a fast-follow) now exist — a "Share" button on the course
  details page (with a version picker, defaulting to latest published) and an "Import
  course" button on My Courses, gated behind a one-time creator-key acknowledgment
  dialog. No `pear-runtime`, no OTA updates.

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
  feature components or pages (enforced by eslint). Visual styling — backgrounds, borders,
  shadows, radius, typography — belongs there, expressed as `cva` variants. Outside `ui`,
  styling should be layout-only (`flex`, `grid`, `gap`, sizing, spacing).
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

- `src/components/ui/badge-variants.ts` is dead code with a hardcoded stone/amber palette
  that contradicts the semantic tokens in `badge.tsx`. Left over from before the shadcn
  restyle.
- `electron/main.ts` redeclares `Category` / `UserRole` / `UserPreferences` locally instead
  of importing from `src/lib/preferences.ts`.
- `src/components/ui/sidebar.tsx` (~720 LOC) and `combobox.tsx` are far past the ~150 LOC
  guideline in working-conventions. They are vendored primitives; leave them unless the
  task is specifically to split them.
- The styling ratchet baseline is 344 visual utilities outside `ui`. That number should
  only ever go down.
- **"Toggle Sidebar" is a hardcoded English literal** and stays untranslated in every
  locale. `check:i18n` cannot catch this class of bug (it compares key parity between
  locale files, not literals in components); it is pinned by an `it.fails` case in
  `e2e/app.e2e.mjs`, which will start failing once the literal becomes a key. Adding an
  `i18next/no-literal-string` eslint rule would catch the whole class.
- No Content-Security-Policy is set, so Electron logs a warning on every launch. Exposure
  is currently low — `react-markdown` runs without `rehype-raw` and nothing uses
  `dangerouslySetInnerHTML` — but this needs hardening before importing course content
  from peers.
- The `*-prototype` components (`editor-prototype`, `course-structure-prototype`,
  `test-editor-prototype`) are exploratory and hold most of the styling violations.
