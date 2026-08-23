# Pear integration notes

> Research notes for the planned peer-to-peer work. **Phases 0–4 are the only Pear/Bare
> code in this repo** (`electron/bare-worker.ts`, `workers/main.cjs`) — local identity,
> single-course publish, real peer discovery/import over Hyperswarm, and gated
> (invite-only) sharing, not a product feature. Phase 4's live cross-process redemption
> is not yet confirmed working end to end — see the roadmap entry below before building
> anything on top of it. Everything else here is verified fact about the upstream stack
> we intend to adopt, recorded so the research is not repeated, not yet a contract about
> Matko.
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
- **`asar: true` → `false`** in the current `electron-builder.json5`. asar breaks worker
  spawning.
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
     Fix: `.cjs` extension, same convention this repo already uses for `.eslintrc.cjs`.
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

5. **Phase 4 — gated sharing. Mechanism built and code-verified 2026-08-23; live
   cross-process redemption unresolved, see below.** Resolves the decision checkpoint
   above as a **hybrid**, not an either/or: each course independently chooses public-link
   sharing (Phase 2/3, unchanged) or gated-to-specific-peers sharing, the latter using
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

   **Open issue, not yet root-caused: live cross-process redemption hangs.** A standalone
   script exercising the exact same pairing logic as `workers/main.cjs` (two Corestores,
   two stable-keypair Hyperswarms, `blind-pairing`, `request.open(invite.publicKey)`) —
   but with host and guest in **one Node process** — pairs successfully in ~5s. The same
   logic run live, as two separate Bare workers spawned by two separate Electron
   instances (the `run-desktop` driver's two-real-instance pattern, the same one that
   confirmed Phase 3's plain import over the real public DHT), hung indefinitely across
   multiple clean attempts on 2026-08-23 — including one left running for a full 10
   minutes, well past any invite's expiry, with the host never logging a received
   pairing request at all. Phase 3's plain `swarm.join()` + `store.replicate()` is
   confirmed working cross-process on this same machine, so the one untested variable is
   `blind-pairing` specifically across two real processes rather than one. **Do not build
   the Share/Import UI (phase 6) on this until a live cross-process redemption has
   actually succeeded** — the mechanism is verified correct in isolation and by code
   review, not yet end-to-end.

6. **Onboarding UX, once phases 0–3 exist:** two flows, no "peer" or "swarm" language
   surfaced to users.
   - **Share** (publisher-only) — a button on a course (or, later, a creator profile
     page) generates a link or invite code, per whichever phase-5 decision was made, for
     the user to distribute through any channel they like.
   - **Import** (everyone) — paste or scan a code, the app resolves it, downloads, and
     mirrors it into `courses/` like any other course.
   - A local "creator profile page" (background image + course collection), if built
     later, is the natural page a resolved key points to — not scoped here.
   - **Open, not yet designed: a key-acknowledgment moment.** The first time Phase 1's
     `createKeyPair('creator')` actually backs a real "Share" action, losing that key
     has the same permanence problem already flagged elsewhere in this doc
     (`pear.json#multisig`: losing keys strands every installed copy) — so generating it
     should be an explicit, brief onboarding step ("this is permanent, here's what it
     means," maybe an export/backup option), not a silent background action. This is
     *not* "let the user choose a storage location" — Corestore's storage lives under
     the app's own data directory the same way `courses/` and preferences already do,
     with no user-facing choice needed there.
   - **Open, not yet designed: search/discovery.** Hyperswarm/Corestore is a
     discovery-by-known-key model (join a swarm on a topic key someone gave you), not a
     searchable-index model — there is no built-in way to "find publishers/courses I
     don't already have a link to." A real search feature would need something acting as
     a directory or index, which either means a centralized (or gossip-based) index
     service, or accepting that discovery only ever happens through the Share/Import
     links above. Worth a deliberate decision before a "channel"/publisher-profile page
     implies more discoverability than the transport actually offers.
