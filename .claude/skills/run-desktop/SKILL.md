---
name: run-desktop
description: Build, run and drive the Matko Electron desktop app. Use when asked to start the app, screenshot it, click through a flow, or confirm a change works in the real app rather than only in unit tests.
---

Matko is an Electron desktop app. Drive it through the Playwright REPL at
`.claude/skills/run-desktop/driver.mjs`, which shares its launch and interaction helpers
with the CI suite in `e2e/` — what you see in the REPL is what the assertions see.

**This is the only way to verify the IPC contract.** Per
[docs/contracts.md](../../../docs/contracts.md), an IPC method exists in four places and
`preload.ts` asserts its return types with unchecked `as Promise<...>` casts, so
`npm run typecheck` cannot catch a mismatch. Exercising `window.courses.*` in the running
app can.

## Build first

The driver launches the built app, not the dev server:

```sh
npx vite build     # produces dist/ and dist-electron/
```

Re-run it after any change to `src/` or `electron/`. The driver fails with a clear message
if `dist-electron/main.js` is missing.

## Run

```sh
node .claude/skills/run-desktop/driver.mjs
```

Launch always uses an isolated `--user-data-dir` (`/tmp/matko-driver-userdata`), so it
never touches a real course library. `launch` wipes it for a clean first-run; `launch keep`
preserves it to resume a previous session.

### Interactive use from an agent (tmux)

`timeout(1)` does not exist on macOS — use a polling helper:

```sh
tmux kill-session -t matko 2>/dev/null; tmux new-session -d -s matko -x 200 -y 50
step() { tmux clear-history -t matko; tmux send-keys -t matko "$1" Enter
         local n=0; while [ $n -lt 200 ]; do sleep 0.3
           tmux capture-pane -t matko -p | grep -qE "$2" && return 0; n=$((n+1)); done
         echo "TIMEOUT on: $1"; return 1; }

step 'node .claude/skills/run-desktop/driver.mjs' 'matko driver'
step 'launch' 'launched:'
step 'ui' 'interactive'
tmux capture-pane -t matko -p -S -40
```

`clear-history` before each command matters: without it the wait pattern matches stale
output from an earlier command and the next one races ahead.

### Commands

| command | what it does |
|---|---|
| `launch` / `launch keep` | start the app (wipe / preserve userData) |
| `ui` | list every interactive element with an index — **start here** |
| `hit <i>` | click element `i` from `ui` |
| `fill <i> <text>` | set input `i`'s value so React notices |
| `click-text <text>` | click a button/link by its visible text |
| `real-click-text <text>` | click via a real Playwright locator instead of DOM `.click()` — see gotcha below |
| `text [sel]` | print `innerText` of the body or a selector |
| `ss [name]` | screenshot → `/tmp/shots/<name>.png` |
| `url` | current route |
| `reload` | reload the window and wait (forces a refetch) |
| `ipc <expr>` | evaluate in the renderer, e.g. `ipc window.courses.list('en')` |
| `main <expr>` | evaluate in the main process, e.g. `main ctx.app.getPath('userData')` |
| `eval <expr>` | evaluate arbitrary JS in the renderer |
| `files [sub]` | tree of the isolated userData dir (default `courses`) |
| `errors` | renderer errors collected since launch |
| `press <key>` / `wait <ms>` | keyboard input / sleep |
| `quit` | close the app (**exits the REPL** — relaunch the process to continue) |

`ui`, `hit` and `fill` all share one index space, so numbers printed by `ui` are directly
usable by the other two.

## Worked example: the onboarding flow

A fresh launch lands on `#/onboarding`, which gates the rest of the app.

```
launch
ui                          → [2] input ph="Type a name or nickname", [3] "Continue" DISABLED
fill 2 Quacky McDuck
ui                          → [3] "Continue" now enabled
hit 3                       → routes to #/onboarding/role
ui                          → [2] "Student", [3] "Teacher"
hit 3                       → lands in the app
ipc window.preferences.get()
```

## Gotchas

- **Clicks go through DOM `.click()`, not Playwright coordinates.** Coordinate math hits
  the wrong layer when content sits in an overlay. This is why you use `hit <i>` rather
  than a selector click.
- **`fill` uses the native value setter plus an `input` event.** Assigning `.value`
  directly leaves React's controlled state stale and buttons stay disabled. If a Continue
  button does not enable after `fill`, that is the real bug, not the driver.
- **Never call `waitForLoadState()` after `firstWindow()`** — the load is often already
  complete and it throws `Target page... has been closed`. `launchApp` waits for React to
  mount into `#root` instead.
- **Mutating via `ipc` does not refresh the UI.** TanStack Query only invalidates when the
  app's own mutation runs. After `ipc window.courses.createDraft(...)`, use `reload`
  before asserting the UI shows it — otherwise you will misdiagnose a stale cache as a
  missing feature.
- **Electron logs a Content-Security-Policy warning** on every launch. Expected — no
  policy is set yet. `launchApp` filters it out of `errors`.
- **`quit` exits the whole REPL process.** In tmux, subsequent `send-keys` then go to the
  shell. Relaunch `node .claude/skills/run-desktop/driver.mjs` to continue.
- **`hit`/`click-text`'s DOM `.click()` does not activate `DropdownMenu` items
  (`@base-ui/react/dropdown-menu`).** Confirmed on both a pre-existing menu (the exercise
  card's Move/Delete actions) and a newly added one — plain `.click()`, a full synthetic
  pointer-event sequence, and keyboard-only activation (focus + Enter + `press ArrowDown`
  + `press Enter`) all silently no-op, with no console error. Use `real-click-text`
  instead, which drives a genuine Playwright locator click. (`ContextMenu`, used for the
  course-structure tree's right-click menu, does not have this problem — plain `.click()`
  works there.) If a `DropdownMenuItem`'s `onSelect` still doesn't fire after switching to
  `real-click-text`, that's a real bug, not the driver.
- **The launched window defaults to well under the `lg` Tailwind breakpoint (1024px)**,
  and several headers use `<PageActions>` (`hidden lg:flex`) for their action buttons —
  they're invisible, and real clicks on them correctly fail, until the window is widened.
  Resize it first: `main ctx.BrowserWindow.getAllWindows()[0].setSize(1300, 900)`.

## Automated equivalent

For assertions rather than exploration:

```sh
npm run check:e2e     # vite build + vitest run --config vitest.config.e2e.mjs
```

That suite (`e2e/app.e2e.mjs`) covers launch, the bridge surface, onboarding, course
listing, draft creation on disk, and locale switching. It is deliberately **not** part of
`npm run check` — it takes ~15s and needs a build. Its tests share one app instance and
run in order.
