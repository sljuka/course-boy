# Pear integration notes

> Research notes for the planned peer-to-peer work. **Phases 0–6 are the only Pear/Bare
> code in this repo** (`electron/bare-worker.ts`, `workers/main.cjs`) — local identity,
> single-course publish, real peer discovery/import over Hyperswarm, gated (invite-only)
> sharing, and a real Share/Import UI wired to the course versioning feature. Phase 4's
> live cross-process redemption is confirmed working end to end as of 2026-08-23 — see
> the roadmap entry below for the real guest-side replication bug that live testing
> caught (not a flaky-network issue, as first suspected). Everything else here is
> verified fact about the upstream stack we intend to adopt, recorded so the research is
> not repeated, not yet a contract about Matko.
>
> Verified 2026-08-17, re-verified 2026-08-21 (upstream commit `5b419fff`), against
> [holepunchto/hello-pear-electron](https://github.com/holepunchto/hello-pear-electron)
> (`package.json`, `forge.config.js`, `electron/main.js`, `AGENTS.md`,
> `agent_docs/architecture.md`). Upstream moves — re-verify before relying on it.
>
> Index: [CLAUDE.md](../CLAUDE.md:1)

## Decision on record

Matko will use Pear for **both** course-content sharing and app distribution
(peer-to-peer OTA updates). Decided 2026-08-17.

## Pear does not replace Electron

`pear-electron`, which did act as a runtime layer, was **archived 2026-04-27**. Do not
build on it.

The current upstream template is an ordinary **Electron 40 + electron-forge** app with
`pear-runtime` as a normal dependency. Consequences:

- Normal signed installers are retained: forge makers for dmg, msix, AppImage, Flatpak
  and Snap, with `osxSign` + `osxNotarize` (`notarytool`) already wired up.
- The install story for users is unchanged — a signed `.dmg`, not "install Pear first".
- What P2P adds is updates with no update server.
- Its `electron/main.js` honours `PEAR_DEV_SERVER_URL` and calls `win.loadURL()`, so a
  Vite dev server still works in development.

## Target architecture

```
renderer (sandboxed, contextIsolation: true)
  ↕  window.bridge — Electron IPC
electron/main.ts — broker only, plus files + electron-store
  ↕  fd-3 FramedStream pipe
Bare worker — corestore + hyperswarm + updater
```

**The updater does not run in Electron.** Main spawns the Bare sidecar and pipes bytes;
the updater lives in the worker. This is also why the P2P stack avoids the native-module
problem: `sodium-native` and `udx-native` are native addons, and an addon built for
Node's ABI will not load in Electron (nor in a forked child — see
[electron#8727](https://github.com/electron/electron/issues/8727)). Bare ships its own
prebuilds, so the addons stay inside Bare and only bytes cross the boundary.

**Exact dependencies (upstream `package.json`), and what each does:**

- `pear-runtime` — the thing that actually spawns and owns the Bare worker.
  `electron/main.js` never touches `child_process` directly; it calls
  `PearRuntime.run(workerPath, [...sixArgs])`, which returns a worker handle, then wraps
  it: `new FramedStream(worker)`. There is no separate "raw Bare binary" spawn path in
  this template — `pear-runtime` *is* the spawn mechanism.
- `framed-stream` — the pipe framing implementation on both ends (Electron main and the
  worker).
- `hello-pear-worker` — the reference worker body (`corestore` + `hyperswarm` +
  updater). Per `agent_docs/architecture.md`: it's shipped as a shared module for
  cross-platform reuse (desktop + mobile/BareKit), and **the intended pattern for a
  single-platform project is to copy `hello-pear-worker/index.js` into an in-project
  `workers/main.js`** and develop it from there, not consume it from `node_modules`.
  Once it's in-project it resolves against *this app's* `package.json`, which is exactly
  why Node builtins it uses need a `package.json#imports` entry — the shared package
  ships its own map, an in-project copy does not inherit it.
- `which-runtime`, `paparam` — platform detection and argv parsing (already covered
  above under "Failure modes").

**Worker spawn contract — six positional args, cross-package with the worker body:**
`getWorker()` in `electron/main.js` calls `PearRuntime.run()` with, in order: `updates`,
`version`, `upgrade`, `productName + platformExtension`, `storageDir`, `installedAppPath`.
The worker reads these positionally (at a different offset on desktop vs.
mobile/BareKit, since the package is shared). A wrong-but-parseable order fails
**silently** — same failure shape as every other contract in this file.

**New finding, this pass — a real blocker for a minimal spike:** `pear-runtime`'s worker
parses `package.json#upgrade` (a `pear://<key>` link) in its constructor **on every
spawn**, regardless of the `--no-updates` flag — `--no-updates` only stops update
*downloads*, it doesn't skip link parsing. The committed upstream value is a literal
placeholder, and upstream's own `AGENTS.md` confirms the consequence: with the
placeholder in place, `npm start` opens the window fine but the worker dies at boot on
the invalid link. A working key only comes from `pear touch`. **`pear touch` is on this
repo's own "never run" list in CLAUDE.md** — so adopting `pear-runtime` as-is for even a
no-op ping/pong spike would require running a command this repo explicitly forbids
without asking first. See the roadmap below for how Phase 0 sidesteps this.

## Migration cost for this repo

- **electron-builder → electron-forge.** The Pear makers
  (`pear-electron-forge-maker-appimage` / `-flatpak` / `-snap`) and the
  `prune-prebuilds` / `universal-prebuilds` plugins are forge plugins.
- **`asar: false`** — done 2026-09-29 in `electron-builder.json5` (SLJ-22), with
  `workers/`, `courses/` and `presets/` added to `files`; asar breaks worker spawning
  (`spawn ENOTDIR` from inside the archive). `npm run check:packaged` guards it, and
  forge would need the same settings.
- Build-output paths move; see contract 6 in [contracts.md](contracts.md:1).
- Upstream is CommonJS (`"type": "commonjs"`); Matko is ESM (`"type": "module"`). Our own
  code can stay ESM — the worker runs under Bare either way — but the template's
  `require()`-style snippets need translating.

## Failure modes that only appear in packaged builds

Every item here passes `npm start` and fails for a real user.

- **`package.json#imports` must map Bare builtins.** Bare has no `events`; worker code
  needs `{"bare": "bare-events", "default": "events"}` (hypercore and hyperswarm ship the
  same map). In dev a hoisted npm shim silently resolves; the packaged app prunes it and
  the worker dies at boot with `MODULE_NOT_FOUND` — the UI loads normally and the backend
  is simply dead.
- **Worker changes are not verified until a packaged build boots.** Bare resolves modules
  differently there. `npm start` passing proves nothing about the worker.
- **`paparam` parses argv strictly** — any unknown flag or positional crashes the packaged
  app at startup. Every launch surface must be declared. This also makes Windows/Linux
  deep links unreachable (a URL in argv kills the process before the single-instance
  lock); only macOS `open-url` works.
- **`pear:startWorker` resolves any renderer-supplied specifier with no allowlist** in the
  template. Fix this in our fork — the renderer is sandboxed precisely so it cannot pick
  arbitrary code to run.
- **`pear.json#multisig`: any edit produces a different production key.** Treat that file
  like a signing key. Losing the keys, or editing the file, strands every installed copy.
- **Version must be bumped or no update fires**, and `package.json#upgrade` needs a real
  key from `pear touch`.

## Debugging: a stall is usually the network

An update that never arrives and a peer that never connects look identical to a code bug.
`pear seed <link> --json` reports `firewalled` and `natType`; `natType: "Random"` means
symmetric NAT, which defeats holepunching, and `upload.totalBytes` then stays 0 forever.
Before debugging app logic, connect two bare Hyperswarm instances on a random topic with
no app code. Exercise real replication against a local `hyperdht/testnet`, not the public
DHT.

## Content sharing design (not yet built)

Maps onto [persistence-notes.md](persistence-notes.md:1) without changing it:

- **Draft** — plain directory, exactly as today. No P2P involvement.
- **Publish** — mirror the package directory into a Hyperdrive signed by the publisher
  key. Same on-disk format, so no "convert draft to files" phase.
- **Import** — replicate the drive, mirror into `courses/`. Files stay canonical locally.
- **Verify** — falls out of the transport: a Hypercore is append-only and signed by its
  key.
- Use **Corestore** rather than raw Hyperswarm once more than one course is involved.
- User state (progress, favourites, bookmarks) stays **out** of P2P initially. Syncing
  mutable per-user state wants Autobase and is a harder problem than content
  distribution.

**Open question — a Hyperdrive key is a permanent read capability.** Anyone who obtains
the link can read the course forever, and it cannot be revoked. Private courses need an
encryption key on the core plus `blind-pairing`-style invites. Decide this before
designing the share UI: "here is a link" and "here is an invite you redeem" are different
screens.

## Integration roadmap & onboarding (not yet built)

Sequenced so the highest-risk unknown — the Electron↔Bare process boundary — gets
validated before any product feature depends on it, and so "identity" stays something
only publishers ever touch, not an onboarding step every user sees.

1. **Phase 0 — validate the process boundary in isolation. Done, 2026-08-23.**
   `electron/bare-worker.ts` spawns a Bare worker (`bare-runtime` — `pear-runtime` was
   deliberately skipped, see above) and exchanges a trivial ping/pong with
   `workers/ping-pong.cjs` over a `bare-pipe` fd-3 `framed-stream` pipe. No corestore, no
   hyperswarm, no renderer/IPC surface — verified via `globalThis.__bareWorkerPhase0Status`
   through the `run-desktop` driver's `main <expr>` command.

   Two real findings from actually wiring this up, not just reading upstream:
   - **`bare-runtime`'s per-platform prebuild resolution uses a computed `require()`**
     (`` require(`bare-runtime-${platform}-${arch}`) ``), which Vite/Rollup's commonjs
     plugin cannot statically bundle — it fails at runtime with "Could not dynamically
     require...". Fix: mark `bare-runtime`, `bare-runtime/spawn`, and `framed-stream` as
     `build.rollupOptions.external` in the `main` entry's Vite config
     (`vite.config.ts`), so they stay real `require()`/`import` calls in
     `dist-electron/main.js` instead of being inlined.
   - **A worker script's file extension matters under `"type": "module"`.** Bare's module
     loader mirrors Node's own ESM/CJS file-type resolution — a plain `.js` file under a
     package.json with `"type": "module"` (Matko's is) gets loaded as ESM, where
     `require` isn't defined, even though the script itself is written as CommonJS. Fails
     as `Uncaught ReferenceError: require is not defined` inside Bare, not at spawn time.
     Fix: `.cjs` extension, the same convention this repo already uses.
     **This directly affects Phase 1's `workers/main.js` plan below — that file will hit
     the identical failure and needs to be `workers/main.cjs` (or a `workers/package.json`
     with `{"type": "commonjs"}`) once it's built, whichever this repo settles on then.**

2. **Phase 1 — local identity, no networking. Done, 2026-08-23.**
   `workers/main.cjs` derives and persists a Corestore-backed keypair (`this becomes
   "your creator key"`) via `store.createKeyPair('creator')` — a deterministic
   derivation from a locally-persisted seed, not a fresh random key each run, and
   without creating an actual Hypercore log (unnecessary until there's content to attach
   the key to). `electron/bare-worker.ts` requests it over `bare-rpc`, which replaced
   Phase 0's raw `framed-stream` ping/pong — `bare-rpc` does its own framing and must
   sit directly on the raw pipe, not stacked under another framing layer. Nothing is
   shared yet. **Only publishers need this** — a user who only ever imports courses
   never generates or sees a key. Identity is created lazily, the first time someone
   presses "Share" (Phase 6) — this phase only built and verified the mechanism itself,
   the same low-level way (a `globalThis` hook read through the `run-desktop` driver)
   Phase 0 was, confirming the same key persists across separate app launches.

   Two real findings, same "verify by actually wiring it up" discipline as Phase 0:
   - **`Bare.argv` is `[bareBinaryPath, scriptPath, ...ourArgs]`** — a worker's own
     spawn arguments start at index 2, not 0 (mirrors Node's `process.argv` convention,
     but easy to get wrong once, as this session did before empirically checking it).
   - **Corestore's storage layer (`hypercore-storage` → `rocksdb-native`) is a second
     native addon** beyond `sodium-native`, both declaring a `bare >= 1.16.0` floor
     (comfortably below this repo's `bare-runtime@^1.31.0`) — no conflict hit, but two
     native addons now resolve prebuilds inside the worker, not one.

3. **Phase 2 — single-course publish/import, verified locally. Publish done, 2026-08-23;
   Import built and proven, not yet wired into the app.**
   `workers/main.cjs`'s `publishCourse` mirrors a course's package directory
   (`localdrive`) into a Hyperdrive namespaced per course
   (`store.namespace('course-'+courseId)`, a distinct key derived from the same root
   seed as the Phase 1 identity key — not the identity key itself, since reusing one
   Ed25519 key across two independent append-only logs is unconventional in this
   ecosystem) — `electron/bare-worker.ts` exposes it as `publishCourse(courseId)`, no
   renderer/IPC surface yet (verified via `globalThis.__matkoBareWorker` through the
   `run-desktop` driver, same as Phase 1). Import was proven the same way Publish was —
   a standalone script, no Electron involved — but is **not** RPC-wired into the running
   app: it needs an actual stream to a peer, which needs Hyperswarm (Phase 3); wiring it
   in now would be untestable-in-context dead code.

   **The "verified locally" question this phase had to settle**: does proving real
   replication (not just a filesystem copy) need `hyperdht/testnet`, as this doc
   originally assumed? No — verified from `hypercore`/`corestore` source directly:
   `store.replicate(isInitiator)` builds the actual production wire protocol (Noise
   handshake via `@hyperswarm/secret-stream`, Merkle-proof-verified blocks via
   `protomux`) over **any** duplex stream, with zero dependency on Hyperswarm, the DHT,
   or even a real OS socket. Two local Corestore instances piped directly together
   (`s1 = storeA.replicate(true); s2 = storeB.replicate(false); s1.pipe(s2).pipe(s1)`)
   genuinely exercise real replication. `hyperdht/testnet` is a *discovery*-layer tool
   (local DHT bootstrap nodes for exercising `swarm.join()`/peer lookup) — orthogonal to
   replication itself, and only becomes relevant once Phase 3 tests discovery.

   Also: Phase 1's Corestore storage directory (`identity`) was renamed to **`p2p`**
   before this phase landed — a namespaced course Hyperdrive shares that same underlying
   storage (namespacing is a key-derivation view, not a separate store), so "identity"
   was no longer an accurate name for what's now the general Corestore data root.

4. **Phase 3 — Hyperswarm discovery. Done, 2026-08-23.** `workers/main.cjs`'s
   `importCourse` finally got wired up — the thing Phase 2 built and proved correct but
   left unconnected, since there was no way to find a peer. One `Hyperswarm` instance
   per worker process, created once at startup, with a single `swarm.on('connection',
   c => store.replicate(c))` — the official Corestore pattern (no auto-join helper
   exists; `corestore-swarm-networking` is a real but abandoned package). The topic is
   the drive's own `discoveryKey` (`hyperdrive.discoveryKey`, proxying to the underlying
   Hypercore's — a one-way hash of the drive's public key, safe to broadcast), not a
   shared/generic topic — only peers who already know a specific drive's key converge on
   its swarm topic, which is exactly why there's no "browse everything" discovery (see
   the search/discovery open question above). `publishCourse` now seeds automatically
   right after mirroring (`{ server: true, client: false }`); **every `importCourse`
   also keeps seeding afterward** (the library default, both true, deliberately not
   overridden) — once import finishes the local Corestore holds a real replica, so
   re-announcing it is free and is exactly the "leech becomes a seed" convention that
   keeps a swarm resilient instead of every course depending on the original publisher
   staying online forever. Both only last while the worker process is alive — no
   background daemon, a real limitation of every app like this, not a bug. Hyperswarm's
   own peer identity stays ephemeral (fresh random keypair every process start,
   confirmed as the actual behavior of the reference `hello-pear-worker` app too, not
   just an assumption) — no documented convention exists for deriving it from the
   Corestore identity key, and nothing yet needs a stable peer identity across restarts.

   **Corrects an assumption this doc made before it could be verified**:
   `hyperdht/testnet` is real and does exactly what was assumed — `require('hyperdht/
   testnet')` exports `createTestnet(size, opts)`, spinning up `size` local DHT
   bootstrap nodes on `127.0.0.1`, returning `{ bootstrap: [...] }` to pass straight into
   `new Hyperswarm({ bootstrap })`. This is how the phase was verified locally (two
   Corestores, two Hyperswarm instances, real discovery + replication, byte-for-byte
   diff against the source) before the live app was checked against the actual public
   DHT, where `publishCourse` successfully announced for real. This is the first phase
   that can fail for NAT/firewall reasons rather than code reasons — the
   `natType: "Random"` / symmetric-NAT note above applies from here on.

5. **Phase 4 — gated sharing. Done, verified live end to end, 2026-08-23.** Resolves the
   decision checkpoint above as a **hybrid**, not an either/or: each course independently
   chooses public-link sharing (Phase 2/3, unchanged) or gated-to-specific-peers
   sharing, the latter using
   `blind-pairing` invites with an app-enforced expiry/use-limit.

   **Two real findings that reshaped the design, both verified from source before
   writing any code:**
   - **A Corestore's `.replicate(conn)` serves every `.namespace()` sharing that root's
     `cores`/`storage` tracker** — namespacing (already used to give each course its own
     key) isolates *keys*, not *what a connection can be served*. And **Protomux — the
     multiplexer under every Hypercore connection — has exactly one slot for the generic
     "unknown discovery key" handler per connection**; calling `.replicate()` from a
     second Corestore on the same connection silently overwrites the first's ability to
     serve new/lazy discovery keys, last call wins. So "one shared store, smarter
     per-core filtering" isn't available. Fix: **two separate `Corestore` instances**
     (`store`, unchanged, public; `gatedStore`, new) — trust tiers are separated by which
     store a connection gets handed to, not by filtering within one store.
   - **`blind-pairing` does not implement expiry or use-limits itself** — verified by
     reading its full source, no `Date.now()` comparison or use counter exists anywhere
     in it. It hands the host `expires` on the invite it creates and reserved protocol
     status codes (`INVITE_EXPIRED`, `INVITE_USED`) to `.deny()` with; checking the
     timestamp/counter and calling `.deny()` at the right moment is 100% host application
     code (`workers/main.cjs`'s `onGatedRequest`).

   **Three more findings surfaced only by wiring this up and testing live, not by
   reading source:**
   - **Hyperswarm's peer identity is ephemeral by default** (a fresh random keypair every
     process start) — gating requires recognizing the *same* peer again after they're
     vetted, so the worker now derives a **stable** swarm keypair from the Corestore
     identity (`store.createKeyPair('swarm')`) instead of letting Hyperswarm generate
     one.
   - **Hyperswarm reuses one connection per peer across every topic they jointly join** —
     it does not open a fresh connection per topic. A routing decision made at initial
     `'connection'` time (public store vs. gated store) has to be explicitly "upgraded"
     later, once that same peer becomes vetted mid-session — tracked via a
     peer-key→connection `Map` so `onGatedRequest`'s `confirm()` path can call
     `gatedStore.replicate()` on the *existing* connection rather than waiting for one
     that will never come.
   - **`blind-pairing` denial does not reject the candidate's `pairing` promise** — it
     surfaces via a `'rejected'` event on `candidate.request` instead, confirmed
     empirically (the promise's own rejection handler never fired; the event did).
     `redeemInvite` races both.

   **A real bug this surfaced, now fixed:** `candidate.close()` was only reachable on the
   success path in the first implementation. `blind-pairing` tracks one "active
   candidate" per discoveryKey internally — a rejected/expired redemption that's never
   closed permanently blocks every future redemption attempt against the same course
   (`"Active candidate already exist"`, reproduced live). Fixed by wrapping the pairing
   await in `try { ... } finally { await candidate.close() }`.

   **A second real bug, found only by live cross-process testing, that the mechanism
   above was designed around but didn't actually cover:** the two-Corestore fix (above)
   upgrades the **host's** side of a connection from `store.replicate()` to
   `gatedStore.replicate()` inside `onGatedRequest`, once that peer is vetted. Nothing
   did the equivalent on the **guest's** side. The generic `swarm.on('connection', ...)`
   handler runs identically on both host and guest — including on the guest, for the
   very connection blind-pairing uses — and it always replicates the guest's own
   (public, usually empty) `store` for a peer it hasn't vetted, since that handler fires
   before pairing resolves and the guest has no allowlist concept for outbound pairing.
   Result: pairing itself completed correctly (confirmed via `blind-pairing`'s host-side
   `confirm()` and the guest's `candidate.pairing` promise resolving with the right key),
   but the guest's replication stream on that connection stayed bound to its own empty
   `store`, which has no knowledge of the gated core — so `drive.update()` afterward
   always reported `core.length: 0` and the mirror step had nothing to copy. Live testing
   first misread this as a network-level hang (redemption calls sat pending indefinitely
   with no visible signal either way), because neither the connection handler nor
   `onGatedRequest` had any logging — a debug pass added temporary instrumentation
   surfaced through a `globalThis` buffer (the driver's `main <expr>` channel, not
   terminal piping — Playwright does not forward Electron main-process stdout/stderr to
   the launching terminal in real time, only in a batched dump at certain lifecycle
   events, which is what looked like "no logs ever appeared" in earlier attempts) and
   showed pairing succeeding every time, just with a silently-empty resulting drive.
   Isolating Bare-vs-Node, the `bare-runtime/spawn` mechanism, and macOS App Nap (tested
   directly with `caffeinate -i`) all ruled those out first — the actual bug was a real
   gap in the design, not environmental. Fixed in `redeemInvite`: after obtaining the
   granted key, replicate `gatedStore` onto the guest's own currently-open connection(s)
   the same way the host does, before joining the drive's discoveryKey. Verified live,
   end to end, immediately after the fix: `PeerA` published a gated course and created an
   invite; `PeerB` redeemed it, paired, fetched the real core
   (`core.length` went from `0` to `3`), and the course appeared in `PeerB`'s own course
   list with correct content.

6. **Onboarding UX — Share/Import UI. Done, public-link only, 2026-09-06.** Real
   `window.sharing` IPC surface (`getCreatorKey` / `shareCourse` / `importCourse`) wired
   to a "Share" button on the course details page and an "Import course" button on My
   Courses — the first two real, user-facing consumers of anything from Phases 0–5.
   Gated/invite-only sharing UI is a deliberate fast-follow (`publishGatedCourse` /
   `createInvite` / `redeemInvite` stay driver-only for now); the mechanism itself was
   already proven live in Phase 4.

   **Sources from a specific published version, not the live draft** — the course
   versioning feature (cut/revert/publish, commit `7979537`) landed shortly before this
   phase and gives a course a real immutable snapshot to share instead. `publishCourse`/
   `publishGatedCourse` resolve `courses/<id>/versions/<x.y>/` via a new
   `getPublishedCoursePackagePath` (defaults to `release.json`'s `publishedVersion`) or a
   specific version the Share dialog's picker requests — the publisher can share any
   version that was ever published, defaulting to latest, exactly as asked. Nothing else
   in the app (not even the learner-facing course player) reads a published version yet;
   that's a separate, larger gap, out of scope here — Share doesn't need it fixed, since
   it never goes through `course-registry.ts`'s readers, only a raw directory path handed
   to `Localdrive`.

   **Import had to learn to discover its own course id.** `importCourse`/`redeemInvite`
   used to require the *caller* already know the target `courseId` — fine for the
   driver-only verification hooks of earlier phases, but a real import only has a pasted
   code. Fixed by mirroring into a staging directory first, reading the real `id` from
   the fetched manifest, and only then finalizing — refusing cleanly
   (`"already imported"`) if that id already exists locally, rather than attempting any
   merge/update. The fetched id is untrusted remote input about to become a directory
   name, so `finalizeImportedCourse` rejects anything that isn't a valid course id
   (`isValidCourseId` in `workers/course-id.cjs`, mirroring `src/lib/course-id.ts`) before
   any path operation — without that check a crafted id like `../../x` could land the
   import outside `courses/`. Needed `bare-fs` as a new direct dependency (already present
   transitively via Corestore's own tree) for the Bare worker to do the exists-check and
   stage-then-rename itself.

   **Two real bugs found only by testing the actual live import, not the isolated
   mechanism:**
   - A published version's own snapshot manifest still says `status: "draft"` — a
     copy-time artifact from how `cutLocalCourseVersion` writes it (see
     persistence-notes.md). Landing that manifest verbatim at a new course's root (no
     `draft/`, matching how the bundled seed course already works) made the import show
     up in Drafts instead of My Courses. Fixed by patching `status` to `"published"`
     during the worker's finalize step, before the rename.
   - **A genuine, pre-existing cross-feature collision**: `migrateNonBundledCoursesToDrafts`
     (`electron/course-paths.ts`, then run on every `ensureLocalCoursesRoot()` call; since
     SLJ-16, 2026-09-29, once per launch) treats
     *any* non-bundled-seed course sitting at its root with no `draft/` as legacy
     pre-migration content, and force-converts it into an editable draft — silently
     undoing the import on the very next `courses:list`/`courses:get` call after it
     landed correctly. This safety net predates Import and was written when the *only*
     root-only course was the explicitly-excluded bundled seed; nothing about it
     anticipated a second legitimate source of root-only content. Fixed by skipping the
     migration for any course whose root manifest already says `status: "published"`
     (a real distinction from truly legacy content, which never had a `status` field at
     all) — confirmed live: without this fix, an import looked correct immediately after
     landing and then silently reverted to a draft on the next page load/reload.
   - Also found and fixed in passing: `preferences:set` (`electron/main.ts`) had a
     hardcoded per-field allowlist that silently dropped any field it didn't
     specifically check for — the new `hasAcknowledgedCreatorKey` flag (below) was
     written by the renderer but never actually persisted until a branch for it was
     added. A silent-no-op failure mode worth remembering for the *next* new preference
     field too.

   **Key-acknowledgment moment, resolved as a lightweight dialog step, not a separate
   onboarding route**: `ShareCourseDialog`'s first-ever open shows an explicit
   acknowledgment ("this creates a permanent identity, it can't be reset later") gated by
   a new `hasAcknowledgedCreatorKey` preference, before the real share action — reusing
   the existing generic `preferences:set` IPC call rather than adding a new one. No
   export/backup flow yet — flagged as a further follow-up, not solved here.

   - **Still open, unchanged by this phase: search/discovery.** Hyperswarm/Corestore is a
     discovery-by-known-key model (join a swarm on a topic key someone gave you), not a
     searchable-index model — there is no built-in way to "find publishers/courses I
     don't already have a link to." A real search feature would need something acting as
     a directory or index, which either means a centralized (or gossip-based) index
     service, or accepting that discovery only ever happens through the Share/Import
     links above. Worth a deliberate decision before a "channel"/publisher-profile page
     implies more discoverability than the transport actually offers.
   - **Still open: a local "creator profile page"** (background image + course
     collection), if built later, is the natural page a resolved key points to — not
     scoped here.

7. **Courses stay shared across restarts; Publish is the share action. Done, 2026-10-03
   (SLJ-38, part 1 of SLJ-9).** Verified by `e2e/sharing-restarts.e2e.mjs`: a teacher and three
   students as separate app instances on a local `hyperdht/testnet`. The teacher publishes
   twice (same code), student 1 imports, and both restart. With the teacher offline,
   student 2 imports from student 1. The teacher then restarts alone and student 3
   imports from it.
   - **Publish puts the current published version online**; the Share dialog and its
     version picker are gone (sharing an older version would have pushed a downgrade to
     every follower). The code is the drive key of the per-course namespace
     (`course-<id>`), so it never changes across versions; it's shown in the Publish
     confirmation and under "Share" in the course editor and on the course page.
     (Since SLJ-55 the namespace is the course's public id, `course-<publicId>`: see "The
     publishing identity" below.)
   - **Consent moved to the first Publish.** The `hasAcknowledgedCreatorKey` dialog now
     appears on the first Publish, with text saying that every published course is
     shared automatically and stays unlisted (reachable only with its code). Nothing is
     shared before it; giving it shares everything already published. Creating, editing
     and printing never ask. (Superseded by SLJ-55: the setup wizard at the first Publish
     is the consent, and the preference is gone.)
   - **`electron/course-sharing.ts`** (unit-tested with fakes) reshares every published
     course and follows every imported course at startup. Publish never fails because
     sharing does: a failed attempt leaves the course "waiting" and retries with backoff
     (30 s doubling to 10 min). State lives in a main-process-only electron-store file,
     `course-sharing.json`: each published course's code, and each imported course's
     `driveKey` + claimed `publisherId`, recorded once at import and never re-read
     from the course's files. Removing a course stops sharing and forgets it.
   - **`source.json`** is written into the drive root by the worker on every publish
     (public and gated), never into the version. mirror-drive's own pruning would delete
     it on every run (it isn't in the version folder) and re-adding it would grow the
     drive on every app start. So `mirrorVersionIntoDrive` mirrors with `prune: false`
     and prunes by hand, skipping `source.json`, which is only rewritten when it changes.
     Import refuses a course without one, or one naming another drive
     (`workers/course-source.cjs`).
   - **New worker commands:** `followCourse` (reopen an imported drive and rejoin the swarm,
     without awaiting `flushed()`, so offline startup doesn't block) and `stopSharing`.
     The worker keeps its open drives in maps, so a repeat publish reuses the drive
     instead of opening a second instance.
   - **Test-only `MATKO_DHT_BOOTSTRAP`** (comma-separated `host:port`) is passed by
     `electron/bare-worker.ts` as the worker's third argument and becomes Hyperswarm's
     `bootstrap`. Unset in the app.

8. **Students get updates. Done, 2026-10-03 (SLJ-39, part 2 of SLJ-9).** Verified by
   `e2e/sharing-restarts.e2e.mjs`, on top of the Phase 7 scenario:
   - an online student is offered the version the teacher just published, and applies it
     from the course page;
   - files the update didn't change keep their inode, so they weren't rewritten;
   - a skipped "fixes mistakes" version keeps a later update recommended, even after
     "Finish on this version";
   - a major version published while the student was offline is offered at their next
     start, with its release notes shown first.
   - **Detection (worker):** each followed drive notifies main (`EVENT_DRIVE_CHANGED`, the
     first worker → main message) on `append`, on `peer-add` (`update({ wait: true })`)
     and on a 15-minute poll. On follow, the drive is marked `findingPeers()` until the
     first swarm flush. Without that, `update()` answers from the local copy right after
     a restart, and a version published while the student was off is missed (this was a
     flaky e2e before the fix). `checkUpdate` reads only `course.json`, `changelog.json` and
     `source.json` from the drive.
   - **Decision (main, `electron/course-sharing.ts`):**
     - `evaluateRemoteVersion` takes only a strictly newer version of the same course,
       from the source recorded at import; otherwise it refuses and warns.
     - It's "recommended" if any skipped version is, and "big" on a major bump.
     - `describeUpdate` applies "Finish on this version": regular updates turn quiet, and
       a recommended one still shows once per version.
     - The state is in `course-sharing.json`.
   - **Apply:** `applyImportedCourseUpdate` (course-paths.ts) does hardlink copy →
     `downloadUpdate` → validate → two-rename swap. Unchanged files aren't fetched again:
     a republish leaves their entries pointing at the same blob blocks, which the student
     already holds. The worker mirrors with `Localdrive({ atomic: true })`, because the
     default in-place `O_TRUNC` write would go through the hardlink into the live course.
   - **UI:** a banner on the imported course's page (Update / What's new / Finish on this
     version), or a quiet line after finishing. A badge on Home. A major update shows its
     release notes before applying. Update is only offered on the course page, never in
     the player, so it can't land mid-test.
   - **Not measured:** the bytes a student downloads for a one-lesson update (only
     verified indirectly via unchanged inodes and mirror-drive's skip of equal entries).

9. **Students keep previous versions and can go back. Done, 2026-10-03 (SLJ-40, part 3 of
   SLJ-9).** Imported courses moved from root-only to `versions/<v>/` + `release.json`
   (`docs/contracts.md` §5). Existing imports migrate at start; new imports migrate right
   after landing.
   - **Updating** builds `versions/<new>/` from a hardlinked copy of the current version
     and the mirrored diff, then repoints `release.json`. It replaces SLJ-39's swap of the
     whole course folder.
   - **Old versions are pruned** to the student's Settings → "Previous versions to keep"
     (default 2, 0–10). Lowering it takes effect at the next update.
   - **The version badge on an imported course's page is a menu** of the versions kept on
     the device. Picking one switches with no download. Going back counts as "Finish on
     this version" for the version left behind. Returning to a kept newer version (from
     the menu or via Update) is just a repoint.
   - Verified by unit tests in `electron/course-paths.test.ts`: migration (incl. an
     interrupted one), update into a new folder with unchanged files shared, switch,
     prune, failure leaves the course as it was, staging cleanup. Also by
     `e2e/sharing-restarts.e2e.mjs`: three versions kept, back and forward through the menu.

10. **Import and update progress, waiting and Cancel. Done, 2026-10-05 (SLJ-43).**
   - **Transfers in the worker:** an import or update download runs under an id the
     renderer chooses, and is polled (no push channel) through `sharing:get-transfer`
     → `CMD_GET_TRANSFER`, every 500 ms while it runs.
   - **Phases:**
     - `finding`: no peer with the data is reachable yet.
     - `downloading`: `bytesDone` of `bytesTotal`, plus speed.
     - `done` / `cancelled` / `error`: the last state stays readable for 60 s.
   - **Totals:** exact and known before downloading, from a `dryRun` mirror. An import
     sums every file; an update sums only added and changed files (a one-lesson update
     reports ~1.5 KB, not the course size).
   - **Progress:** `max(bytes written, mirror-drive's downloadedBytes)`, with
     `progress: true`.
   - **Waiting instead of failing:** an import whose code nobody online is sharing used to
     mirror an empty drive and fail with a misleading "no valid source.json". It now
     waits in `finding` until a peer has the drive's file list (`waitForDriveData`), and
     never gives up by itself. The UI says nobody is online after 30 s
     (`NOBODY_ONLINE_AFTER_MS`).
   - **Cancel:** `sharing:cancel-transfer` → `CMD_CANCEL_TRANSFER`. Every wait is raced
     against the transfer's cancel promise. An import closes its drive, leaves the swarm
     and removes its staging folder. An update stops waiting and main removes the
     staging version. The **followed drive is not closed** (it keeps sharing), so a block
     already in flight may still arrive into the Corestore cache. Cancel returns
     `{ cancelled: true }` instead of throwing, because Electron IPC drops error codes.
   - **Gotcha:** a *second* `Hyperdrive` instance on a key already open in the same
     Corestore never became ready (`drive.ready()` hung). Updates therefore download
     through the followed drive itself.
   - Verified by `e2e/sharing-restarts.e2e.mjs`:
     - a 2 MB import reports its full size;
     - a one-lesson update reports < 10% of it;
     - with the teacher offline, Home's Downloading group shows "Looking for the
       course…", and Cancel leaves no staging folder and no course.
   - **Imports run in the background (SLJ-49).** The Import dialog closes as soon as the
     worker knows the transfer, which means the code was accepted. A bad code is still
     reported in the dialog.
     - From then on Home lists the import under **Downloading**, with a progress ring,
       status and Cancel, until the course lands under **Imported**. A failure stays
       there with Dismiss.
     - The imports live in TanStack Query's mutation cache (`usePendingImports`,
       `gcTime: Infinity`), so they survive leaving Home. They don't survive a renderer
       reload; the worker still finishes the import, but it is no longer listed.
     - The transfer snapshot carries the course's titles (`course`), read from the
       drive's `course.json` once a peer has the data, so the row names the course
       before it lands.
   - **Peers online.** `CMD_GET_PEERS` (13) returns `drive.core.peers.length` for a
     course shared from this device: your own by course id, an imported one by drive
     key. `getCourseSharing` returns it as `peers`, or null when the course isn't
     shared here right now. The Share dialog ("Online · Peers online: 2") and the
     course page's Details panel poll it every 5 s.
     - It counts only peers connected to *this* device for that course, right now.
       It is not how many people have the course.
     - Measured at scale on a local testnet with `scripts/measure-peers.mjs` (2026-10-17;
       all students online at once, joining 25 at a time):

       | Students online | Teacher sees |
       | --------------- | ------------ |
       | 25              | 25           |
       | 100             | 87           |
       | 200             | 131          |
       | 400             | 181          |

       Every student got the course, most of them from other students.
     - Hyperswarm's `maxPeers` (64) limits only the connections a device opens itself.
       A student stops connecting out once it holds 64 connections, so the students who
       arrive later often never reach the teacher. Hyperswarm itself sets no limit on
       connections a device accepts (`maxServerConnections` is never checked in 4.17),
       so the table above has none.
     - The worker caps every computer at 256 connections, for all its courses
       together (`workers/connection-limit.cjs`). When it's full, new peers are
       refused at the handshake, and their ban is lifted at once so they're welcome
       when there's room. Vetted peers of invite-only courses are always let in.
       With `--max=40` and 100 students, the teacher held 40 connections and every
       student still got the course. The count can't go above the cap.
     - So the count is a lower bound, and its share of the audience falls as the
       audience grows. The local testnet has no NAT and no lag, so on the real network
       expect it to be lower still.
     - Students can share a publicly imported course too: `code` is the drive key
       they imported with. A `gated` followed course (invite-only, not in the UI yet)
       gets no code.

## The publishing identity: one password, one file (SLJ-53, SLJ-54, SLJ-55)

The publishing identity is 32 random bytes. Every course's public id and code, and
the publisher id, are derived from it ([workers/identity-keys.cjs](../workers/identity-keys.cjs:1)).
It's kept as **one file locked with one password**, and that file is also the backup.
The design was simplified on 2026-10-07; before that there was a separate backup file
and an optional second password, and the identity sat in the OS keychain.

### Setting it up

- **The wizard** ([set-up-identity-dialog.tsx](../src/components/identity/set-up-identity-dialog.tsx:1)):
  first what going online, signing and the identity file are, then a password typed
  twice. It runs at the **first Publish** (`usePublishWithConsent`: cancelling it
  cancels the Publish) or from **Settings → Sharing → "Set up your publishing
  identity"**. Teachers who only make, print or hand over course files never see it.
- **The identity file** is `<profile>/publisher-identity.matko-identity`
  ([electron/publisher-identity.ts](../electron/publisher-identity.ts:1)). It's written
  once and never changes, so a copy never goes stale. **Settings → Sharing → "Open
  identity file"** shows it in Finder or Explorer (`shell.showItemInFolder`) for
  copying somewhere safe.
- **Format** ([workers/identity-backup.cjs](../workers/identity-backup.cjs:1)):
  - **In the clear:** `format`, `formatVersion`, `createdAt`, `publisherId` (the creator
    public key), and the KDF parameters.
  - **Encrypted:** `{ primaryKey, courses: [] }`. The course list is always empty: courses
    are found from the identity instead (below).
  - **Encryption:** Argon2id (`crypto_pwhash`, moderate: ~0.6 s, 256 MiB) →
    `crypto_secretbox`. Parameters above the caps are refused when the file is opened.
  - **Failures:** a wrong password and an edited file both fail authentication
    (`WRONG_PASSWORD`). Passwords are NFC-normalized. A forgotten password can't be
    recovered, which the wizard says plainly.
  - The worker seals and opens it (`CMD_SEAL_IDENTITY` = 19, `CMD_OPEN_IDENTITY` = 16);
    main writes it atomically with mode `0600`. The key never reaches the renderer.

### Unlocking it

- **Locked at every start.** A profile with an identity asks for the password before
  Home (`PublisherPasswordGate`), or "Open without publishing". Unlocked, main hands the
  identity to the worker in memory (`CMD_SET_IDENTITY` = 18); it's never stored there.
- **Locked, the courses stay online.** Published courses are shared by their code
  (`CMD_SEED_COURSE` = 20), and Publish is refused (`courses:publish-version`); the
  next Publish asks for the password (`UnlockIdentityDialog`).
- **The password protects publishing, not the course files**, which stay ordinary files
  on disk. Settings says so.

### Public ids: finding courses again from the identity alone

- Each course keeps its own random **local id** (its folder, the package's `course.json`
  id; students keep it too).
- At its **first Publish** a course gets the next number for this identity, n = 0, 1,
  2… (`publicIndexFor` in `electron/main.ts`; `nextPublicIndex` in the `course-sharing`
  store only grows, so a removed course's number is never reused). Its **public id** is
  `publicCourseId(identity, n)`: a keyed hash with the identity's *secret*, so without
  it nobody can work out a teacher's other public ids or codes, and unlisted courses
  stay unlisted. The course's key pair (and code) is derived from the public id with
  Corestore's scheme (`namespace('course-<publicId>').createKeyPair('db')`). The public
  id is written into the drive's `source.json`; n itself is never published.
- **Programs** (SLJ-32) are numbered the same way but on their own counter
  (`nextPublicIndex` in the `program-sharing` store): `publicProgramId(identity, n)`,
  a keyed hash under a different context, and the key pair from
  `namespace('program-<publicId>')`. A program's and a course's numbers never collide.
  Restoring finds programs from these too, after the courses (SLJ-32 phase 3).

### Restoring it on a new computer

On a new computer, **Settings → Sharing → "Restore from a file…"** takes a copy of the
identity file and its password. (Until 2026-10-07 the new-profile screen also offered it,
as a checkbox opening the same dialog after onboarding; it lives in Settings only now.) The flow is in [electron/identity-restore.ts](../electron/identity-restore.ts:1).

1. **The file.** Main reads it (OS open dialog, at most 1 MB) and the worker checks it
   (`CMD_READ_IDENTITY_BACKUP` = 15): the dialog shows its name and date.
2. **The identity.** The worker opens it with the password, checking the key inside is
   the file's `publisherId`, and the copy becomes the profile's identity file as it is
   (`publisherIdentity.install`), unlocked.
   - **Refused** when this profile already put courses online with another identity:
     they could never be updated again. A new profile is the way.
   - **The same identity again is allowed;** its courses already on this device count
     as found.
3. **The courses.** The search looks up course numbers 0, 1, 2… among students, ten at
   a time (`CMD_FIND_COURSE` = 17: derive the public id and code, look for someone who
   has it for 30 s, `NOT_FOUND` otherwise), and stops after 20 numbers in a row aren't
   found (`GAP_LIMIT`, like a wallet's gap limit; a deleted course is just a gap).
   Lookups join the swarm as clients only: announcing many topics at once slowed them
   down. A course found is downloaded into `courses/.recover-staging-*`, and
   `landRecoveredCourse` (`course-paths.ts`) makes it the teacher's own course:
   `versions/<v>/` (without `source.json`), `draft/` from it, `release.json`. Only then
   is it shared again, with its number recorded, so the code and identity are the old
   ones. Once the password is accepted the dialog closes and the app goes to My
   courses, whose **Restoring** group lists courses and programs as they're found while
   the search runs (SLJ-66). It also says that earlier versions and changes never
   published stayed on the old computer. Settings keeps the record of what was found,
   and **"Look again"** there searches once more for courses nobody had online the
   first time.

**Why the order matters (proven 2026-10-06, then by the e2e).** A core opened with its
key pair is *writable*, and a writable core never asks peers for a longer history: it
would stay at length 0, and the next publish would start a second history that
students' apps refuse. So the lookup opens the drive **by its key only** (created from
the manifest, no key pair stored), which syncs from students like any import.
Publishing then passes the key pair **in memory**: `openPublishedDrive` builds the
drive's db core itself with `store.get({ key, keyPair })` and hands it to Hyperdrive as
`_db` (a Hyperbee; hence `hyperbee` in `dependencies`). The blobs core takes the db
core's key pair. Only the current version's blocks are needed to continue the history.

### The worker's store holds no secret

Its Corestore has its own random seed; cores are created from their manifests only
(`openCourseCores`), and only writing sessions get a key pair, in memory. The swarm key
comes from the store's seed, so sharing needs no unlocking. Passing a key pair when a
core is *created* would store the secret again; the regression check below guards it.

**Tests** (`e2e/sharing-restore.e2e.mjs`, `e2e/sharing-password.e2e.mjs`):
- the identity file opens only with the password and holds the identity behind the
  code, and the teacher's `p2p/` contains neither the identity nor the course's signing
  key after publishing;
- the first Publish runs the wizard; cancelling it publishes nothing;
- after a restart: the password screen, "Open without publishing", the course still
  shared, Publish refused, then Publish asking for the password;
- restoring: the old computer's identity file copied right after setup, a student
  imports, the new computer restores (a wrong password first), finds the course by its
  number, and publishes a version the student gets as a normal update.

## Publisher key at rest (SLJ-46 spike, 2026-10-05)

**Question:** can the publisher's signing keys stay out of plain-text storage, so an
optional publisher password (SLJ-42) actually protects something? **Yes**; built in
SLJ-55 as the section above describes (without the keychain and the migration below:
development data was throwaway).

The spike's findings and design, for the record:

**Verdict: feasible.** Proven with throwaway Node scripts against the same corestore
7.12 / hypercore 11.35 / hyperdrive 13.3 the worker uses. Each run scanned every file of
the store (RocksDB logs and SSTs) for the primary key and the course's secret key.

### Today

Both secrets are on disk in plain text in `userData/p2p/db/*`, and the control run found
both:

- **The primary key:** Corestore stores it as its seed.
- **Each course's secret key:** it sits in the headers of the drive's db and blobs
  cores. Hypercore writes `keyPair.secretKey` into the header **when it creates the
  core** with a key pair.

### What the spike proved

1. **Codes stay identical.** We can derive a course's key pair ourselves with Corestore's
   own scheme, and get the same drive key, so every published code stays valid:
   ```js
   ns   = generichash_batch([ZERO_32, 'course-<id>'])
   seed = generichash_batch([NS('corestore', 1), ns, 'db'], primaryKey)
   keyPair = crypto_sign_seed_keypair(seed)
   driveKey = Hypercore.key({ version: 1, signers: [{ publicKey }] })
   ```
2. **A drive can live in a store with no secrets.**
   - **The store:** a Corestore with its **own random seed**, unrelated to the teacher.
   - **Creating the cores:** both cores are created **by manifest only**, with no key
     pair.
   - **Writing:** the writing session gets the key pair in memory only:
     ```js
     const db = store.get({ manifest: dbManifest })                      // create: no secret stored
     store.get({ manifest: Hyperdrive.getContentManifest(db.manifest, db.key) }) // blobs, same
     const writer = new Hyperdrive(store, { _db: new Hyperbee(store.get({ manifest: dbManifest, keyPair }), beeOpts) })
     await writer.put(...)                                               // signed in memory
     ```
     After writing files, including a 200 KB blob, the scan finds **nothing**. It still
     finds nothing after a second unlock-and-write.
   - **Gotcha:** the blobs manifest must come from the real db core's
     `manifest` / `key`. With a hand-built one, Hyperdrive creates its own blobs core
     with the full key pair, and the secret is back on disk.
3. **Locked seeding works.** With no key pair at all, the store opens the drive by its
   key, reads it, and serves it to a student who has only the code (video included). So
   resharing at startup (SLJ-38) needs no unlock.
4. **Unlocking later continues the same history.** A new version appended after an
   in-memory unlock reaches the student as a normal update (`fork 0`, no conflict).
5. **Migration works.**
   - **Steps:** replicate each drive (db and blobs) from today's store into a new
     secret-free store, with cores opened by manifest, then delete the old store.
   - **Result:** full history, identical lengths, no secrets in the new store.
6. **Hyperdrive's two cores** follow the same rules. The blobs core uses the db core's
   key pair (a different signer namespace in its manifest).

### Design for SLJ-42

- **Identity:** the 32-byte primary key is held by the main process.
  - **Default:** encrypted with `safeStorage`.
  - **Optional:** encrypted with the publisher password (Argon2id → secretbox).
  - **The worker never stores it.** It gets the key at unlock and keeps it in memory
    until quit.
- **The worker's store:** a Corestore with its own random seed, harmless if copied.
  - Published drives are opened by key (locked); they're written only through
    `get({ manifest, keyPair })` sessions created on Publish.
  - Course key pairs are derived per course with the scheme above.
- **Swarm identity:** `store.createKeyPair('swarm')` on the *new* store, derived from its
  harmless seed, so it never needs unlocking.
  - It changes **once**, at migration.
  - Today only the driver-only gated allowlists depend on it.
- **Creator key** (`publisher.id`): the public key is cached in plain text for display
  (`getCreatorKey`). The secret is needed only when publishing, which is unlocked
  anyway.
- **Migration**, one-time at upgrade:
  1. Read the old store's seed (= the identity) and hand it to main's key storage.
  2. Create the new store.
  3. Replicate every published drive locally by manifest; replicate followed drives
     too, to avoid downloading them again.
  4. Verify the lengths.
  5. Delete `p2p/`.
  - Deleting files doesn't scrub SSD blocks, so the OS disk-encryption advice stays.
- **Gated store (`p2p-gated`):** today it has its own random seed, so gated course keys
  are neither derived from the identity (not backed up) nor protected. When gated
  sharing gets a UI, derive those keys from the identity the same way, under a
  different name.
- **Risks:**
  - `Hyperdrive`'s `_db` option is internal API: pin the versions, and cover it with a
    test.
  - Passing a key pair when a core is *created* silently stores the secret again. Add
    a regression test that publishes and then scans the store directory for the secret,
    as this spike did.

## Courses owned by two publishers (SLJ-11 spike, 2026-10-09)

Can two publishers own one course together, so that a version goes online only when
both sign it? **Verdict: yes, with the libraries already installed** (Hypercore 11,
Hyperdrive 13, Corestore 7). Proven with throwaway Node scripts, not in the app.

### How it works

- A Hypercore's **manifest** can list several signers and a **quorum** (how many must
  sign). The core's key is a hash of the manifest, so the course's code comes from the
  publishers' public keys, their order, and the quorum alone. Each publisher works it out
  independently, with no secret and no message exchange.
- Hyperdrive derives its blobs core's manifest from the main core's (same signers, own
  namespaces: `Hyperdrive.getContentManifest`). A drive with several signers needs no
  special handling.
- **Publishing a version:**
  1. One publisher writes the version into a *source* drive of their own (an ordinary
     single-key drive).
  2. The others replicate it, review it, and each sign the source cores' tree hash at
     the agreed lengths, bound to the shared cores' keys (`caps.treeSignable(sharedKey,
     treeHash, length, fork)`). That is two 64-byte signatures per publisher: one for the
     main core, one for blobs.
  3. Whoever holds the blocks copies them into a named (draft) session of each shared
     core and commits it with the assembled signatures
     (`core.commit(draft, { signature })`).
- **Students** follow the shared drive by its code like any other. They don't need to
  know it's co-published. They can see it from the manifest (signers, quorum).

### What the spike proved (2 of 2)

- Both publishers derive the same code. A different quorum or signer order gives a
  different code.
- Neither publisher's key alone can write the shared core.
- A commit with one signature of two is refused (`INVALID_SIGNATURE`), and so is a
  forged second signature.
- With both signatures the version lands. A student reads it: `course.json` and a 200 kB
  asset.
- A second version, signed only for the new lengths, reaches the student as a normal
  update (the `append` event the worker already listens for).
- The other publisher gets the shared drive by replication too, so either one can commit.

### What it found against "either can publish alone" (1 of 2)

- With several signers, a plain `core.append(…, keyPair)` signs in the single-signer
  format. Peers can't verify it and silently ignore the block. Even a one-signature
  publish has to go through the draft + assembled signature path.
- **A fork is fatal.** Both publishers published a different version 1 while apart, and
  both are valid. The student kept the first it saw. When one publisher then published
  version 2 on top of their own, Hypercore detected the conflict and **closed the core
  on every copy: both publishers' and the student's.** The course is gone for everyone.
  So 1 of 2 only works if the publishers never publish at the same time. For "either
  teacher can publish whenever", use Autobase (several writers merged into one view)
  instead.

### Library: `hyper-multisig`

Holepunch publishes `hyper-multisig` (2.4.0, updated 2026-07). It's "Multisig hypercore
and hyperdrive", built on the same Hypercore and Hyperdrive versions, and Bare-compatible
(`bare-events`). It does the flow above:

- `createDrive(publicKeys, namespace, { quorum })`;
- `requestDrive(…, srcDrive, length)` → a portable signing request
  (`hypercore-signing-request`), which can travel over the swarm or as text;
- signers answer with `hypercore-sign`;
- `commitDrive(…, request, responses)`.

It adds the checks a hand-rolled version would need: a conflict check before committing,
and refusing to commit until enough peers (`minFullCopies`, default 2) hold the full
version. The spike's hand-rolled path reaches into Hypercore internals
(`hypercore/lib/caps`, `core.core.verifier.assemble`, marked "TODO: better api" upstream).
**Use the library if this is built.** Adding it is a new dependency: ask first.

### Open questions for the feature

- **Membership is fixed.** Adding or removing a publisher, or changing the quorum,
  changes the code. Students would need a "this course moved" step. SLJ-59 (move courses
  to a new identity) needs the same.
- **Losing a key under 2 of 2 freezes the course.** 2 of 3 survives one lost identity.
- **Key derivation:** each publisher's key for a shared course would come from their
  identity, as per-course keys do today (`course-<publicId>`). Restoring on a new computer
  would also need the other members' public keys (record them in `source.json`).
- **The publish flow gains a waiting state:** "signed by you, waiting for <co-publisher>".
  The request has to reach the other app, and their signature has to come back.
- **`hyper-multisig` refuses to commit until 2 peers hold the full version.** Two
  publishers both online would satisfy it.
- **Not run under Bare** (the worker) yet. It uses the same libraries the worker already
  loads.

### Building it (2026-10-09): approval on `hyper-multisig`

Decided: co-maintained courses use **approval** (a version goes online only when more
than half of the maintainers sign it), built on `hyper-multisig`, now a runtime
dependency. Milestone 1 is `workers/shared-course.cjs`, tested in
`workers/shared-course.test.mjs` with two maintainers and a student on a local testnet.
It isn't wired to the worker's RPC yet.

- **Keys:** each maintainer's key for a course is `maintainerKeyPair(identity,
  publicId)`, from the course's original public id. Each proposal gets its own drive,
  `proposalKeyPair(identity, publicId, n)`. Both are derived like the other keys
  (`identity-keys.cjs`), so restore can find them.
- **The rule:** `sharedCourseSpec` refuses any rule that isn't more than half, so two
  groups that can approve always share a member. Signers are sorted, so every maintainer
  derives the same code.
- **A proposal starts with a verbatim copy of the shared course's blocks.** What's
  signed covers the proposal's whole history, and the shared course's history must be
  an exact beginning of it. A fresh proposal drive per proposal avoids cutting a drive
  back: a truncated core has a new fork number, and the signatures wouldn't match.
- **Review** (`openProposalForReview`) refuses a proposal that isn't for this course,
  isn't what the request describes, or doesn't continue the course's latest version
  (`NOT_LATEST`).
- **Signing** uses the request format's public helpers (`signable`,
  `encodeResponse`) with the derived key in memory. `hypercore-sign-lib`'s
  password-encrypted key files aren't used.
- **Commit** relaxes the library's "2 other computers must hold it" checks
  (`minPeers: 0`, `minFullCopies: 0`). With two teachers they'd block forever: the
  library's post-commit check loops until enough copies exist. Its fork checks (tree hash
  and target compatibility) stay on. The app seeds the course itself.
- **Gotchas met:**
  - On a shared course with no version yet, `Hyperdrive.getBlobs()` waits forever, so
    the proposal copies from the cores `hyper-multisig` opens.
  - A second Hyperdrive on a key already open never becomes ready, so review reads
    the shared course's core only.
- **Review downloads almost nothing.** `core.treeHash(length)` fetches only the block at
  that length and its Merkle proof. So the proposal's beginning is checked against the
  shared course (file index and file data) without downloading it. Unchanged files point
  into that verified part; only files whose data lies past it are new
  (`openProposalForReview` returns them as `changes`), and only those are fetched, when
  opened for review. A 2 GB course with one edited lesson costs about that lesson and the
  file index. The test checks that an unchanged asset's blocks are never downloaded.

**Milestone 2 (moving a course):** `writeMovedNotice` puts `movedTo` into the old drive's
`source.json`. Students' apps follow it to the new code and keep the old one shared. An
import from the old code is redirected before anything downloads, following at most 3
notices. Updates skip files whose `version-meta.json` hashes match the installed version:
`mirror-drive` otherwise streams both copies of every same-size file to compare them,
which on a moved course's new drive means downloading all of them. The module test moves
a course to a 1-of-1 shared course and checks that a 200 kB unchanged asset never crosses
the network. Starting a move from the app comes with inviting a maintainer (milestone 3).

**Milestone 3 (maintainers in the app):**
- **Invite:** a `blind-pairing` code. The invited maintainer's app answers with its
  publisher id, maintainer key and mailbox; the owner's app confirms with its own mailbox.
- **Mailboxes:** everything else travels through per-course mailbox drives
  (`workers/maintainers.cjs`).
- **Decisions:** `electron/maintainers.ts` reads the mailboxes on every change and acts:
  - it takes members and the rule from the owner's mailbox;
  - it lists other maintainers' proposals for review;
  - it commits your own proposal once enough approvals have arrived;
  - after the first commit it writes the moved notice;
  - it lands the shared course on a newly joined maintainer's computer.
- **The shared course's key:** each app records it as soon as the members are known.
  Otherwise its first version (a change to the shared drive, not to a mailbox) wouldn't
  reach a maintainer who hasn't landed the course yet.
- **Publish:** a Publish of a shared course is a proposal (`publishShared`). With the
  identity locked it only seeds.
- **e2e:** `e2e/sharing-maintainers.e2e.mjs` "a course maintained by two teachers" (about 50 s): two
  teachers and two students.
  - Marko approves the first shared version; students follow the course to the new code.
  - Marko's version goes online only after Ana approves it.
  - A student with only the old code gets the shared course.
- **Not built yet:**
  - adding or removing maintainers after the course is shared (another move, approved
    under the current rule);
  - the UI (milestone 4);
  - deleting committed proposals' drives (disk space on the proposer's side);
  - restore (milestone 5).


**Milestone 4 (the UI):**
- **Maintainers panel** in the course editor (`src/components/maintainers/`):
  - invite one person at a time (each gets a code);
  - "Start maintaining together", with the rule picked as a consequence ("2 of 2 approvals required",
    "2 of 3 approvals required"; only rules with more than half are offered);
  - then the maintainers, the rule, your version waiting for approval, and any notes
    asking for changes.
- **"Join as a maintainer"** on My courses.
- **Approvals:** a Teaching sidebar item, shown with a count while something waits. Its
  page lists proposals by course title (the proposal carries it, since the course may
  not be on your computer yet). Since SLJ-109 the item is always shown once you
  maintain a shared course, and the page keeps a history in groups (see below).
- **Review page:** the changed files, then Approve or Ask for changes with a note.
- **Publish** of a shared course reads "Ask for approval", and its dialog says the
  version goes online once enough maintainers approve.
- **Fixed on the way:**
  - The owner's app checked every join request against its first invite only, so a
    second invite could never be used. Requests are now looked up by their invite id.
  - An invite code is handed out only once the owner's app can be found by it
    (`swarm.flush()`).
  - Accepting no longer waits for the owner's mailbox to arrive, and mailbox reads time
    out after 10 s. Before, a join could appear to hang.
- **Follow-up:** the review page shows file paths. Showing lessons and sections, and a
  "Preview as student", is SLJ-67.

**Milestone 5 (restoring shared courses):**
- **The owner:** "Restore from a file…" counts through your course numbers as before. A
  course found with a "moved" notice is followed to its shared course
  (`landSharedCourse`, `restoreSharedCourse`). The app reads its maintainers, with their
  mailbox keys (now in the shared course's `source.json`), and its rule, then lands
  the latest shared version and takes it up again as owner.
- **Other maintainers:** a shared course isn't numbered under their identity. They ask
  the owner for a new invite and join again: their keys come from their identity, so
  they come back as the same maintainer and the course lands again. An invite on a
  shared course only lets existing maintainers back in; adding new maintainers to a
  shared course comes later.
- **No forked mailboxes:** a mailbox's key comes from the identity, so a new computer
  has the same mailbox without its history. Before its first write there, the app
  fetches the history from whoever has it (`syncBeforeWriting`; one quick lookup if
  nobody does).
- **Proposal drives** are numbered by time, so a restored computer never reuses one
  the old computer wrote to.
- **Joining retries:** if the owner isn't found within 10 s, the app looks again from
  scratch, up to 6 times. A missed lookup isn't retried by the swarm for a long while;
  this caused intermittent "joining hangs".
- **e2e:** "a course maintained by two teachers" now also covers Ana restoring on a new
  computer and Marko rejoining from his (about 90 s for the group).
- **Open:** a rare worker crash ("Cannot read properties of null (reading
  'byteLength')") was seen once during these runs. The worker now logs the stack of an
  uncaught error before exiting, so the next occurrence can be traced.

### Sharing e2e, split (SLJ-69, 2026-10-11)

`e2e/sharing.e2e.mjs` (35 tests, about 9 minutes, flaky at the end of a full run) is now
five files, one per area: `sharing-restarts`, `sharing-restore`, `sharing-password`,
`sharing-programs` and `sharing-maintainers`. `e2e/sharing-suite.mjs` gives each file its
own folder, its own testnet (5 DHT nodes) and its own apps, all closed when the file
ends, so any file runs on its own. All five take about 2 min 45 s in a row.

The flakiness was partly the shared network: one testnet, and more than a dozen apps
by the end. It was also real app bugs, which only showed up there:
- **A mailbox could be left unreadable.** A new computer learned its old mailbox's
  length from a peer without the entries, and wrote on top. Once the peer left, nobody
  held the full history. Fixed: the history is fetched before the first write whenever
  entries are missing, and every maintainer keeps a full copy of the mailboxes they
  follow.
- **A mailbox read could hang** despite per-call timeouts. Each read is now bounded as
  a whole, and every shared course is read again every 20 s, so a missed or failed read
  doesn't leave a course waiting for a change that never comes.

### Reviewing a proposed version (SLJ-67, 2026-10-11)

- **Release notes:** the review page shows the proposal's release notes since the
  version online now: the author's notes, and the changes in course terms. They come
  from the version's own `changelog.json` in the proposal, as its cut wrote them
  (`notesSince` in `electron/maintainers.ts`). The proposer's app writes them, so the
  list of changed files (folded below) stays the check.
- **"Preview as student"** downloads the proposed version into the profile's
  `previews/<hash>/<course id>/`. It starts from a hardlinked copy of the version this
  device has, so only files whose `version-meta.json` hash differs are fetched (worker
  op `downloadProposal`).
- **The throwaway course id:** main gives the preview a temporary id (`previews` in
  `openProfileServices`). `courses:get` and the `matko-asset://` protocol read that id
  from the preview's folder, so the student course page and player work unchanged.
- **Kept apart from real courses:** the details carry a `preview` marker, so the course
  page shows a banner and a way back to the review instead of sharing, versions and
  the side panel. Progress and stars aren't recorded for preview ids.
- **Cleanup:** previews are deleted when the proposal is approved or changes are asked
  for, and all of them at every profile open.
- **IPC:** `maintainers:preview` (`window.maintainers.preview`).
- **Invites are for one publisher:**
  - The owner enters the invitee's publisher id (shown with a copy button in Settings →
    Sharing). The joining app signs its answer with the key behind that id
    (`creatorKeyPair`), covering the invite id, the course, and the keys it brings.
  - The owner's app checks that signature (`verifyJoin` in `workers/maintainers.cjs`), so
    anyone else with the code is refused, and the keys are proven to be that
    publisher's.
  - A code works once (the same publisher may retry) and for a week.
  - `maintainers:invite` now takes `{ courseId, publisherId }`.

### Approvals history (SLJ-109, 2026-10-11)

- **A record per proposal:** each shared course's record in the maintainers store keeps
  `proposals` (by request hash): version, proposer, who approved, notes asking for
  changes, state and dates. Rebuilt on every refresh from every maintainer's mailbox
  (your own included), so the counts cover anyone's proposal. Decided ones are capped
  at 100 per course. It replaces the old `inbox`.
- **States:** `waiting`, `online`, `replaced`. The worker op `proposalState` compares
  the request's tree hashes with the shared course at the request's length (file index
  and file data). Same means `online`, whoever committed it; different means another
  version took the spot (`replaced`). A waiting proposal whose proposer's mailbox now
  names a newer one is `replaced` too, and so is one whose Approve fails with
  `NOT_LATEST`.
- **The 2-of-3 fix:** before, the third maintainer kept a version that went online
  without them as "waiting for you". Their app now sees it's in the shared course.
- **Groups** (`groupOf` in `electron/maintainers.ts`): Waiting for you (someone else's,
  unanswered); Waiting for others (yours, or answered, with "1 of 2 approved · waiting
  for …"); Changes requested; Approved; Replaced (folded).
- **Sidebar:** shown once the profile maintains a shared course; the badge counts only
  Waiting for you.
- **Version page:** where it stands on top (who approved, who hasn't, notes, "Open the
  course" once online). Files and Preview only for someone else's version still
  waiting (yours is open in the worker as your own drive; a decided one's drive may be
  gone); Approve and Ask for changes only while it waits for you.
- **Restoring keeps the one-approval-per-spot rule:** the history and what you answered
  live in the profile, so a new computer starts without them. Each refresh, and each
  Approve or Ask for changes, rebuilds them from your own mailbox
  (`recoverOwnAnswers`): every approval or change request there counts as answered.
  An approval now carries its spot (`/approvals/<hash>.json` = `{ response, spot }`);
  for an older one without it, of a proposal still waiting, the proposal is checked
  again to get it. Without this, a restored computer could approve a rival version for
  a spot it already approved one for, and two versions could both reach the rule (a
  fork). Proposals replaced before the restore aren't listed again: a mailbox keeps
  only its current `/proposal.json`.
- **IPC:** `maintainers:list-approvals` now returns `{ items, maintained }`.
- **e2e:** `e2e/sharing-maintainers.e2e.mjs` checks the badge, the groups, and the
  read-only page once approved.

### Proposing takes the spot; withdrawing (SLJ-110, 2026-10-11)

- **The gap:** proposing signs the version, but didn't count toward the
  one-approval-per-spot rule. A proposer could also approve a rival for the same spot,
  and with 2 of 3 both versions could reach the rule (a fork).
- **Now proposing takes the spot** (`approvedAt`, with the spot also in the proposer's
  `/approvals/<hash>.json`, so a new computer rebuilds it). `seedShared` returns the
  shared course's length and `propose` the spot it built on.
- **Withdraw** (`maintainers:withdraw`, a button on your own version's page) frees the
  spot, only while no other maintainer has approved it: with someone's approval out
  there it could still reach the rule. Checked against every mailbox, read then. It
  writes `/withdrawn/<hash>.json`, clears `/proposal.json` and drops the proposal
  drive. Others' apps list it as withdrawn (in Replaced), and Approve checks the
  proposer's mailbox first, so it's refused there too.
- **Proposing again** for the same spot withdraws the previous proposal, under the same
  condition. Otherwise the Publish is refused until the version goes online or is
  replaced.
- **A withdrawn version isn't proposed again** by the Publish that runs at every start;
  a newer committed version is.
- **What's left:** a race where someone approves in the moment between the withdraw's
  check and its notice. Only the proposer's app commits a proposal, and it dropped it,
  so an honest app never puts it online.

### Changing maintainers or the rule (SLJ-70, 2026-10-12)

- **Generations:** a shared course's code comes from its maintainers' keys and the rule,
  so changing either is another move. Each change is a new **generation**: the spec's
  namespace becomes `matko-shared-course-<public id>-g<n>` (generation 0 keeps the old
  name), so the same maintainers and rule coming back never land on an earlier
  generation's key. `source.json` and `/members.json` carry `generation`.
- **Joining a shared course:** an invite on a shared course lets someone join as
  **pending** (`pending` in the owner's record and `/members.json`). They become a
  maintainer only through a change.
- **A change** (`proposeChange`, `maintainers:propose-change`, the owner only; the owner
  stays a maintainer) is one proposal with two signing requests:
  - its own request: the current shared course's **moved notice** (the version online
    with `movedTo` in `source.json`, nothing else changed), approved under the current
    rule by the current maintainers;
  - `change.next`: the next generation's **first version** (the same files), approved
    under the new rule by the new maintainers.
  - Someone in both sets signs both (`response` and `responseNext` in their approval
    file). Approving checks the next request against the spec the change names, and
    refuses a notice that changes anything but bookkeeping.
- **Commit** (the owner's app, once both rules are met): the next generation's first
  version first, then the notice, so students only follow to something there. Every
  app then moves: `previous` keeps earlier generations (still seeded for their
  notices), `members`/`quorum`/`generation` change, and the course is shared from the
  new code (`onShared`). Students follow the notice like the first move.
- **Removed maintainers:** their app marks the record `removed`: no longer shared, the
  course stays on their computer as their own.
- **Spots** are per generation (`spotKey`: `<generation>:<length>`, plain length for
  generation 0). The change takes the notice's spot in the current generation and the
  first spot of the next.
- **Restore** follows the chain of notices to the latest generation
  (`restoreSharedCourse`, at most 50), and the course's code becomes the latest key.
- **UI:** Maintainers panel: joined people listed, "Change maintainers or the rule"
  (pick people, pick the rule; says when the current rule needs a removed maintainer's
  approval). Approvals and the version page show a change as "Change of maintainers"
  with who it adds and removes and the rule before and after.
- **Fixed on the way: every maintainer keeps the shared course's full history.** A
  proposal starts with a copy of every block of the shared course, but a restored
  computer only downloaded the latest version's files. Once the computers that had the
  history were gone, nobody could propose anything (the copy waited forever). The
  worker now downloads both cores whole for every shared course it opens
  (`keepFullCopy`), and copying the history gives up after 60 s with a clear error
  (`HISTORY_UNAVAILABLE`).
- **Not built:** changing the owner; a change while a version waits (refused: decide
  or withdraw it first); SLJ-59 (moving to a new identity) will reuse the same notice.

### Proposal drives: deleted once over, reopened after a restart (SLJ-111, 2026-10-12)

- **Why:** a proposal drive starts with a copy of every block of the shared course, so
  each proposal held another full copy of the course's history on the proposer's
  computer, for good (`dropProposal` only closed it).
- **Now:** `dropProposal` clears both cores' blocks (`purgeProposal` in
  `workers/shared-course.cjs`, by the cores' keys: once its first block is cleared, a
  drive would wait for its header from the network). `purge()`, which would remove the
  cores entirely, fails in Hypercore 11.35, so the cores' small tree data stays.
- **When:** right after a commit and a withdrawal, as before, plus a sweep at every
  refresh (`clearDecided`) for any proposal of ours that's over and not yet cleared:
  replaced by someone else's version, or left behind by a crash or an older version.
  Each is cleared once (`cleared` on the history entry). A proposal of ours that
  another version replaced also stops showing as waiting for approval.
- **Fixed on the way:** after a restart the worker never reopened a proposal still
  waiting, so the proposer's app couldn't commit it ("This proposal is not on this
  device") and reviewers couldn't fetch it. `start()` now opens it again
  (`openProposal`, read-only is enough to commit).

### Keeping history across a move: not possible yet (SLJ-112 spike, 2026-10-12)

The idea: the next generation's cores get a Hypercore **prologue** ("my first N blocks
are the current generation's"), so nobody downloads the course again after a move and
students who followed it can seed the new drive from their old copy (`copyPrologue`).

- **Hypercore: yes.** A multisig manifest (version 1: signers, quorum) with a prologue
  works. `copyPrologue` fills the new core locally from the old one, on a signer's
  store and on a reader's, with no download. It's only reachable through the internal
  core (`session.core.copyPrologue`), not the public session API.
- **Hyperdrive: no, for the part that matters.** A drive's file-data core, which holds
  nearly all the bytes, is found from the header in the file index's block 0
  (`contentFeed`, empty for shared courses), or derived from the file index's manifest by
  `generateContentManifest`, which always sets `prologue: null` ("TODO: could be
  configurable through the header"). With a prologue on the file index, block 0 is the
  old drive's header, so the file data would start in a fresh core anyway.
- **The signing requests and hyper-multisig: no either.** `hypercore-signing-request`
  derives the file-data key the same way (`Hyperdrive.getContentKey`), and
  hyper-multisig's commit builds its own manifests (`getManifest`, no prologue option).
- **So:** only the file index (small) could keep its history, which isn't worth the custom
  code. Doing it for the file data needs upstream changes in Hyperdrive (a configurable
  file-data prologue), hypercore-signing-request and hyper-multisig, or our own
  manifests, signing and commit for drives.
- **Decided (2026-10-12): moves start fresh, and we live with the seeding gap.** Moves are
  rare (a change of maintainers), students who have the course follow at almost no
  cost, and only new students right after a move depend on maintainers being online
  until others have imported fully. No upstream changes pursued. If the gap turns out to
  matter, students who share the course could download the new drive in the background
  (SLJ-41). A canary test (`workers/shared-course.test.mjs`) fails once Hyperdrive gives
  the file-data core a prologue.

### Old versions' file data, cleared (SLJ-113, 2026-10-12)

- **Why:** a Hyperdrive never edits in place. Replacing a 1 GB video appends the new one,
  and the old one's blocks stay in the file-data core on every computer holding the
  drive: the teacher's, and every student's that downloaded it. Nobody needs them:
  imports and updates fetch only the current version's files, and going back to an
  earlier version uses the student's own copies (`versions/<v>/`).
- **What:** `clearOldVersions` (`workers/drive-storage.cjs`) clears the file-data blocks
  no file of the current version points to. The file index stays whole.
- **When** (`clearOldVersionsSoon` in `workers/main.cjs`, in the background, bounded to
  60 s): on **students'** computers, after an update is applied and once per run for
  every followed drive opened at startup. It works on one version, fixed when it
  starts (a checkout, and that version's file-data length), so blocks written meanwhile
  are never touched.
- **Not on the teacher's computer yet (SLJ-114).** Clearing the drive a course or
  program is published from broke students' next update in e2e (sharing-restarts,
  sharing-programs). The cause is a Hypercore bug
  ([hypercore#891](https://github.com/holepunchto/hypercore/issues/891), still in
  11.39.0). A student connected while the teacher clears receives "blocks a–b dropped",
  and `Peer.onrange` lowers that peer's contiguous length to `a`. The blocks after `b`
  were known only through that length, so the student forgets the teacher still has
  them and never asks for the new version's files. It hangs because it already sent a
  want for that segment earlier. Students who connect after the clear are fine. A local
  patch to `onrange` made the restarts file pass. We wait for an upstream release
  rather than carry a patch, so a teacher's own drives still keep their history. Never for
  shared courses' drives on maintainers' computers (`sharedDrives`) either: they keep
  their whole history by design.
- **Needs Hypercore 11.37.2 or later** (updated 2026-10-12, lockfile only). In 11.35.2, `clear` also deletes the tree node of the block right
  before the cleared range (its sibling check reads `s <= start` instead of
  `s >= start`). The computer keeps the block's data but can no longer prove it, so a
  new student can't fetch it. `clearingIsSafe` checks the installed version, and nothing
  is cleared before 11.37.2. Hyperdrive's own `clear(path)` has the same problem.
  `workers/drive-storage.test.mjs` covers a teacher-style drive, a student, and a
  write while clearing.

### Publishers: an address book of Publisher IDs (SLJ-108, 2026-10-12)

- **What:** a "Publishers" page, its own sidebar section below Favorites, for teachers
  and students alike. It lists the people and groups the profile knows by their
  Publisher ID. Each row: the id shortened ("4y9dgb89…") with a button copying it whole,
  the name or "No name" (opens it to rename or remove), and the names of their courses
  and programs, each once (the first two; "and N more" grows the row to list the rest
  under them). Where they come from:
  - imported courses and programs: the publisher their `source.json` claims;
  - courses maintained together: co-maintainers and joined people (SLJ-11, SLJ-70);
  - entered by hand: shown as "Added by you".
- **Names courses carry:** a teacher can give a Publisher name (Settings → Sharing; the
  identity setup suggests the profile name, and it can be cleared). The worker writes it
  into every course's and program's `source.json` (`publisher.name`) when it publishes,
  and courses are put online again when it changes (programs at their next Publish).
  Publishers reads it from the imported copy's `source.json` (`claimedName`), so it
  arrives with the import and changes with each version. Shown everywhere with the id,
  "Ana (4y9dgb89…)", or "4y9dgb89…" without one; a label the student typed wins.
- **Courses maintained together** list every maintainer: "by Ana (4y9dgb89…), Marko
  (k3x8…)", the owner first. Each maintainer's app puts its Publisher name in its mailbox
  (`/profile.json`); the others read it, and every proposed version's `source.json` carries
  all of them (`maintainers.members[].name`). A rename reaches students with the next
  version. Students' Publishers list every maintainer, from the course they imported.
- **Stored:** `electron/publishers.ts`, in the profile's `publishers.json`. Only what the
  teacher added is kept: names, hand-entered publishers, and removed ones (`hidden`, so
  an import doesn't bring them back). The rest is read from the followed courses and
  programs and the maintainers state each time the list is shown, so imports need no
  hook. This profile's own Publisher ID is never listed.
- **Used by:** the Invite dialog (pick from Publishers, or type an id and "Save to
  Publishers as"), and wherever maintainers are named: the Maintainers panel, Approvals,
  the version page and the change dialog show the name instead of the short id
  (`usePublisherName`).
- **Not verified:** a name is what the teacher typed, and a course's claimed publisher
  is unverified until SLJ-18. The page says so.
- **Imported courses say who published them:** "by *name*" on Home's rows and cards and
  a Publisher row in the course's info panel, from Publishers (`useImportedPublisher`):
  the name given there, else the Publisher ID shortened ("4y9dgb89…").
- **IPC:** a new bridge, `window.publishers` (`list`, `save`, `remove`;
  `publishers:*`).
- **Not built:** an author name from the course (that would be a course package format
  change, so it waits for a decision; SLJ-31's signed publisher profiles fit better), and
  showing who published each course in a program.


### The built-in course as a published course (SLJ-115, 2026-10-12)

- **What:** Getting Started is published like any course, by a publishing identity kept
  for the project (Publisher ID `8du7ye9o…` in `courses/bundled.json`; its file and
  password stay with the maintainer, never in the repo). The app ships a snapshot of the
  published version so it's there offline from the first start, and follows the course's
  code for updates, which students get like any imported course's (offered, notes, going
  back). It keeps the "Built in" badge and is hidden rather than removed.
- **`courses/bundled.json`:** `{ courses: [{ courseId, code, publisherId }] }`. With a code,
  `readBundledCourseSources` (course-paths.ts) checks that the snapshot's `source.json` says
  it comes from that code and Publisher ID (else the code is ignored), and the course is
  installed as `versions/<v>/` + `release.json` like an imported one. Main then records it as
  followed (`followBuiltIn`, course-sharing.ts) before sharing starts. Until the first
  publish the code is `null` and the app installs it at the course's root as before.
- **Newer wins:** the shipped version is installed only when it's newer than every version
  kept on the computer, so a student who already updated from the network (or went back to
  an older version) stays where they are. A root copy from an earlier app is replaced;
  progress is kept (it's by course id).
- **Maintaining it** (`scripts/built-in-course.mjs`, with the app closed):
  1. `adopt <profile folder>`: once, in a teacher profile set up with (or restored to) the
     project's identity: makes the shipped course that profile's own, under My courses.
  2. Edit and publish it there as usual.
  3. `snapshot <profile folder>`: copies the published version into `courses/<id>/` with the
     `source.json` its drive holds (the profile's Publisher name included, so students see
     "Matko (8du7ye9o…)" from the start), and its code into `bundled.json`. Commit; the next app
     release ships it.
  Both refuse a profile whose identity isn't the one in `bundled.json`.
- **Seeding:** a fresh install has the snapshot as files, not drive blocks, so it passes the
  course on only once it has downloaded a version. Updates need someone online with it: the
  maintainer's computer or students who have it. An always-on seeder is an operational
  choice for later.
- **Tests:** `MATKO_BUNDLED_COURSES_DIR` (tests only) points the app and the script at
  another snapshot. `e2e/sharing-built-in.e2e.mjs` runs the whole path: adopt, publish,
  snapshot, an install from before moving over with its progress, then the next version
  arriving as an update.

### Channels: a publisher's home (SLJ-31 phase 1, 2026-10-13)

- **What:** each teacher has a channel (My channel, in the sidebar): a name, description,
  logo, banner and colors, the courses they show on it (newest first) and their programs.
  Students open it from a course's page or from Publishers ("Open channel", on the
  row of a publisher whose course names a channel), see what's on it, get courses
  and programs from it, and follow it (Home → Channels; changes arrive on their own, new
  courses marked New, as in a program).
- **Built on programs:** a channel is a program marked `kind: "channel"`, so it reuses the
  program drive, code, images, theme, following and updates. The UI never calls it a
  program. `electron/channels.ts` keeps the profile's own: created the first time it's
  needed, named from the Publisher name given at the identity setup (now "Channel name",
  the nickname to start with), and rebuilt from "Show on my channel" whenever a course
  goes online or its listing changes.
- **"Show on my channel":** a checkbox after Publish and on the course's page. On at a
  course's first publish, off for courses published before channels, so nothing already
  out there became findable without its teacher choosing it.
- **Checked, not claimed:** a listed course's `source.json` names the channel
  (`channel.driveKey`); the channel is signed by its publisher and lists the course back.
  A student's course page links the channel only once both agree; before the channel is
  here it offers "Open channel", and it says so when the channel doesn't list the course.
- **The name** courses carry (`publisher.name`, shown "Ana (4y9dgb89…)") is the channel's:
  publishing the channel puts the teacher's courses online again with it.
- **Phase 2 (SLJ-125):** channels run by several people, like a school, on the
  maintained-together machinery. Phase 1 has one channel per profile and one channel per
  course.
- **Tests:** `electron/channels.test.ts`; `e2e/sharing-channels.e2e.mjs` (a first publish
  lands on the channel, a student opens it from the course and sees it checked, a course
  shown later reaches them).

### Programs credit who made each course (SLJ-126, 2026-10-13)

- A program can already hold anyone's courses (added by code; students import each from
  its own publisher), like a playlist. Now its page says so: each course shows who
  published it ("by Ana (4y9dgb89…)", every maintainer once the course is here), and an
  imported program says who curated it ("Curated by …"; a channel, "Published by …").
- One way to show a publisher everywhere: `PublisherName` / `PublishedBy`
  (`src/components/publishers/publisher-name.tsx`): "Ana (4y9dgb89…)" with a name (the
  label you gave them in Publishers, else the one their course carries), "4y9dgb89…"
  without, the full Publisher ID on hover. Home, course cards, the course page, program
  rows and the curator use it.
- **Can it be downloaded now? (SLJ-127):** a program's or channel's page checks each course
  not here yet (`programs:peek-course`, which now also returns `peers`; three at a time,
  again every minute, `useCourseAvailability`): "Available · N online" (who this
  computer reached, so at least that many), or "Not available right now", and the header
  says "N of M courses available right now". Import stays offered either way: it waits,
  and downloads once someone who has the course comes online.
- **Imports that wait survive a restart (SLJ-128):** main keeps every import it's running
  (`course-sharing` store `imports`: `{ code, transferId, startedAt }`) until it lands, is
  cancelled, or the worker reports a real failure (not a course, say); a worker that stops
  because the app quits doesn't count. At every start they're picked up again in the
  background (`resumeImports`), one per code. Home's Downloading lists them too
  (`sharing:list-imports`, merged with the window's own), cancellable as before.

### Keep sharing in the background (SLJ-129, 2026-10-13)

- **Why:** a course can only be downloaded while someone who has it is running Matko, and
  closing the window used to quit everything.
- **Asked once, the same for everyone:** the first time the window is closed while the
  profile has something to share (published or imported courses, or an import waiting),
  main stops the close and asks the window (`background:ask-keep-sharing`): "Keep sharing
  while Matko is closed?", with an unticked "Also start Matko when I log in". The answer
  is saved in the profile's preferences (`keepSharingInBackground`, `openAtLogin`); later
  closes follow it. Dismissing the dialog keeps the window open.
- **Kept running:** the window hides (and the Dock icon on macOS); a menu bar / tray icon
  (a target, drawn at runtime, a template image on macOS) shows how many courses are
  shared, with Open Matko and Quit Matko. Quitting (its Quit, Cmd+Q, or answering "Quit
  Matko") stops everything. Opening Matko again (the Dock, a second launch) shows the window.
- **Open at login:** off by default; starts hidden with `--hidden` (macOS:
  `wasOpenedAtLogin`), just the tray. Set with `app.setLoginItemSettings`.
- **Settings → Sharing:** "Keep sharing when the window is closed" and "Open at login".
- **Linux:** no reliable tray on every desktop, so closing keeps quitting
  (`isBackgroundSupported`), and the settings aren't shown.
- **Code:** `electron/background.ts` (close handling, tray, login item), its texts from the
  locale files via `electron/main-texts.ts`. Tested by `e2e/sharing-background.e2e.mjs`.
