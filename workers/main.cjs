// The real, ongoing Bare worker body (see docs/pear-integration-notes.md) — supersedes
// Phase 0's disposable workers/ping-pong.cjs spike. Talks to electron/bare-worker.ts
// over bare-rpc on the fd-3 pipe (Bare.argv[0] is the Bare binary itself, [1] this
// script's own path — spawn arguments start at [2]).
const Pipe = require('bare-pipe')
const RPC = require('bare-rpc')
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const Hyperbee = require('hyperbee')
const Localdrive = require('localdrive')
const IdEncoding = require('hypercore-id-encoding')
const Hyperswarm = require('hyperswarm')
const BlindPairing = require('blind-pairing')
const fsp = require('bare-fs/promises')
const path = require('bare-path')
const { isValidCourseId } = require('./course-id.cjs')
const { movedToKey, unchangedFileKeys, verifySource } = require('./course-source.cjs')
const { createMaintainers, requestHash } = require('./maintainers.cjs')
const { clearOldVersions } = require('./drive-storage.cjs')
const {
  commitProposal,
  createProposal,
  openProposalForReview,
  proposalState,
  hasProposal,
  purgeProposal,
  openSharedDrive,
  sharedCourseKey,
  sharedCourseSpec,
  signRequest,
  writeMovedNotice,
} = require('./shared-course.cjs')
const { createIdentityBackup, IdentityBackupError, openIdentityBackup, readIdentityBackup } = require('./identity-backup.cjs')
const { courseKeyPair, creatorKeyPair, programKeyPair, publicCourseId, publicProgramId } = require('./identity-keys.cjs')

const CMD_GET_CREATOR_KEY = 1 // must match electron/bare-worker.ts
const CMD_PUBLISH_COURSE = 2 // must match electron/bare-worker.ts
const CMD_IMPORT_COURSE = 3 // must match electron/bare-worker.ts
const CMD_PUBLISH_GATED_COURSE = 4 // must match electron/bare-worker.ts
const CMD_CREATE_INVITE = 5 // must match electron/bare-worker.ts
const CMD_REDEEM_INVITE = 6 // must match electron/bare-worker.ts
const CMD_FOLLOW_COURSE = 7 // must match electron/bare-worker.ts
const CMD_STOP_SHARING = 8 // must match electron/bare-worker.ts
const CMD_CHECK_UPDATE = 9 // must match electron/bare-worker.ts
const CMD_DOWNLOAD_UPDATE = 10 // must match electron/bare-worker.ts
const CMD_GET_TRANSFER = 11 // must match electron/bare-worker.ts
const CMD_CANCEL_TRANSFER = 12 // must match electron/bare-worker.ts
const CMD_GET_PEERS = 13 // must match electron/bare-worker.ts
const CMD_READ_IDENTITY_BACKUP = 15 // must match electron/bare-worker.ts
const CMD_OPEN_IDENTITY = 16 // must match electron/bare-worker.ts
const CMD_FIND_COURSE = 17 // must match electron/bare-worker.ts
const CMD_SET_IDENTITY = 18 // must match electron/bare-worker.ts
const CMD_SEAL_IDENTITY = 19 // must match electron/bare-worker.ts
const CMD_SEED_COURSE = 20 // must match electron/bare-worker.ts
const CMD_PUBLISH_PROGRAM = 21 // must match electron/bare-worker.ts
const CMD_SEED_PROGRAM = 22 // must match electron/bare-worker.ts
const CMD_PEEK_COURSE = 23 // must match electron/bare-worker.ts
const CMD_FIND_PROGRAM = 24 // must match electron/bare-worker.ts
// Courses shared by several maintainers (SLJ-11): one command, the operation
// named by `op` (see sharedCourseOp below).
const CMD_SHARED_COURSE = 25 // must match electron/bare-worker.ts

// Programs (SLJ-32) share `publishedDrives` with courses under this prefix, so
// a program's id can never collide with a course's.
const PROGRAM_ENTRY_PREFIX = 'program:'
// Peeking at a course (its course.json only) waits this long for a peer.
const PEEK_TIMEOUT_MS = 20_000
// Worker → main: an imported course's drive may hold a newer version. Main
// decides what that means (electron/course-sharing.ts).
const EVENT_DRIVE_CHANGED = 100 // must match electron/bare-worker.ts
// Worker → main: someone joined as a maintainer with one of our invites.
const EVENT_MAINTAINER_JOINED = 101 // must match electron/bare-worker.ts

// How often followed drives are checked for a new version even without an
// 'append' event (e.g. after being offline). Main ignores repeats.
const UPDATE_POLL_INTERVAL_MS = 15 * 60_000
// Reading a remote file waits for a peer that has it; don't wait forever.
const REMOTE_READ_TIMEOUT_MS = 30_000
// Clearing old versions' file data (SLJ-113) gives up after this: offline, a
// part of a followed drive's file index may not be here yet.
const CLEAR_TIMEOUT_MS = 60_000
// A finished transfer's last state stays readable this long, so the UI can show
// its final numbers after the import/update call has returned.
const FINISHED_TRANSFER_TTL_MS = 60_000

// Written into every shared course's drive next to the version's files (never into
// the version itself, so its hashes stay valid): where the course is shared from.
// See "source.json" in docs/contracts.md §5.
const SOURCE_FILE_KEY = '/source.json'
// How many "this course moved" notices an import follows (SLJ-11).
const MAX_MOVED_HOPS = 3

// Hyperdrive's own options for its file list (its "db" core, a Hyperbee).
const DRIVE_DB_OPTIONS = { keyEncoding: 'utf-8', valueEncoding: 'json', metadata: { contentFeed: null } }

const storagePath = Bare.argv[2]
// Test-only: a comma-separated list of `host:port` DHT bootstrap nodes (a local
// `hyperdht/testnet`), so e2e tests never touch the public DHT. Empty in the app.
const bootstrap = Bare.argv[3]
  ? Bare.argv[3].split(',').map((address) => {
      const [host, port] = address.split(':')
      return { host, port: Number(port) }
    })
  : undefined
// The store holds no secret (SLJ-55): its seed is random and unrelated to the
// publisher, so copying p2p/ gives nobody the right to publish. The publisher
// identity is held by main and handed over in memory (CMD_SET_IDENTITY); every
// core is created from its public manifest, and only a writing session gets the
// key pair, in memory. See "Publisher key at rest" in docs/pear-integration-notes.md.
const store = new Corestore(storagePath)
// Separate from `store`, not a `.namespace()` of it: a Corestore's `.replicate()`
// serves every namespace sharing its root `cores`/`storage`, and Protomux only keeps
// one slot for "an unknown discovery key showed up" per connection — so one store
// can't safely serve both "anyone who connects" and "only vetted peers." Trust tiers
// are separated by which store a connection gets, not by filtering within one.
const gatedStore = new Corestore(`${storagePath}-gated`)

// An error nothing caught still ends the worker, as it would anyway, but with
// its stack in the log first (Bare's own abort prints only the message).
Bare.on('uncaughtException', (error) => {
  console.error('[worker] uncaught error:', error?.stack ?? error)
  Bare.exit(1)
})
Bare.on('unhandledRejection', (error) => {
  console.error('[worker] unhandled rejection:', error?.stack ?? error)
  Bare.exit(1)
})
async function start() {
  // Hyperswarm's peer identity is normally a fresh random keypair every process
  // start. Gating needs it to be stable: the host has to recognize the *same* peer
  // again on a later connection (after `onadd` confirms them), and Hyperswarm reuses
  // one connection per peer across every topic they join together. Deriving it from
  // the store's own (harmless) seed makes it stable without the publisher identity,
  // so it never needs unlocking.
  // Assigned once the control pipe is set up below; the drive watchers use it to
  // notify main.
  let rpc = null
  const swarmKeyPair = await store.createKeyPair('swarm')
  const swarm = new Hyperswarm({ bootstrap, keyPair: swarmKeyPair })
  const pairing = new BlindPairing(swarm)

  const allowlist = new Set() // hex-encoded stable swarm public keys, vetted for gated content
  const connectionsByPeerKey = new Map() // hex peer key -> live conn, for upgrading an already-open one
  const invites = new Map() // hex invite id -> { driveKey, expiresAt, invitePublicKey, maxUses, usedCount }
  const gatedMembers = new Map() // hex discoveryKey -> blind-pairing Member (one per gated course)
  // Drives this worker is serving, so a repeat publish/follow reuses the open drive
  // and stopSharing can leave the swarm. Teacher-side drives by course id, imported
  // (followed) drives by hex drive key.
  const publishedDrives = new Map() // courseId -> { drive, discovery, writable }

  // The publisher identity (32 bytes), in memory only, from main; null before
  // there is one and while it's locked with the publisher password.
  let identity = null

  function requireIdentity() {
    if (!identity) {
      throw Object.assign(new Error('The publisher identity is locked'), { code: 'LOCKED' })
    }
    return identity
  }

  // A course's two cores, created from their public manifests only, so no
  // secret is stored. (Passing a key pair when a core is *created* writes the
  // secret key into its header.) The blobs manifest must come from the real db
  // core: from a hand-built one, Hyperdrive would create its own blobs core with
  // the key pair. Returns the open cores; close them once a drive uses them.
  async function openCourseCores(publicKey) {
    const db = store.get({ manifest: { signers: [{ publicKey }], version: store.manifestVersion } })
    await db.ready()
    const blobs = store.get({ manifest: Hyperdrive.getContentManifest(db.manifest, db.key) })
    await blobs.ready()
    return { close: () => Promise.all([db.close(), blobs.close()]), key: db.key }
  }

  // Old versions' file data, cleared (SLJ-113, drive-storage.cjs): on
  // students' computers, after an applied update and once per run for every
  // followed drive opened at startup. Not on the teacher's computer for now:
  // clearing the drive a teacher publishes from broke students' next update
  // in e2e (sharing-restarts, sharing-programs) for a reason not found yet
  // (SLJ-114). Never for shared courses' drives (`sharedDrives`): maintainers
  // keep their whole history. In the background and bounded: it only frees
  // space.
  const clearedThisRun = new Set()
  function clearOldVersionsSoon(drive, { oncePerRun = false } = {}) {
    const hex = drive.key.toString('hex')
    if (oncePerRun && clearedThisRun.has(hex)) return
    clearedThisRun.add(hex)
    withTimeout(clearOldVersions(drive), CLEAR_TIMEOUT_MS, 'CLEAR_TIMEOUT').catch((error) =>
      console.error('[worker] clearing old versions failed:', error?.message ?? error),
    )
  }

  async function closePublishedDrive(courseId) {
    const entry = publishedDrives.get(courseId)
    if (!entry) return
    publishedDrives.delete(courseId)
    await swarm.leave(entry.drive.discoveryKey).catch(() => {})
    await entry.drive.close().catch(() => {})
  }

  // A published course shared without the identity (locked, at startup): read
  // by its code and served to students. Publishing a new version needs the
  // writable drive (openPublishedDrive), which replaces this one.
  async function seedPublishedDrive(courseId, driveKey) {
    const existing = publishedDrives.get(courseId)
    if (existing) return existing

    const drive = new Hyperdrive(store.session(), IdEncoding.decode(driveKey))
    await drive.ready()
    const discovery = swarm.join(drive.discoveryKey, { server: true, client: false })
    const entry = { discovery, drive, writable: false }
    publishedDrives.set(courseId, entry)
    return entry
  }
  const followedDrives = new Map() // hex driveKey -> { drive, discovery }

  swarm.on('connection', (conn, peerInfo) => {
    const peerKeyHex = peerInfo.publicKey.toString('hex')
    connectionsByPeerKey.set(peerKeyHex, conn)
    conn.on('close', () => connectionsByPeerKey.delete(peerKeyHex))

    if (allowlist.has(peerKeyHex)) {
      gatedStore.replicate(conn)
    } else {
      store.replicate(conn)
    }
  })

  function onGatedRequest(request) {
    const record = invites.get(request.inviteId.toString('hex'))

    if (!record) {
      request.deny({ status: 1 }) // PAIRING_REJECTED - unknown/foreign invite
      return
    }

    const guestSwarmKey = request.open(record.invitePublicKey)

    if (record.expiresAt && Date.now() > record.expiresAt) {
      request.deny({ status: 3 }) // INVITE_EXPIRED
      return
    }

    if (record.usedCount >= record.maxUses) {
      request.deny({ status: 2 }) // INVITE_USED
      return
    }

    record.usedCount += 1

    const peerKeyHex = guestSwarmKey.toString('hex')
    allowlist.add(peerKeyHex)
    request.confirm({ key: record.driveKey })

    // Upgrade an already-open connection to this peer immediately — Hyperswarm
    // reuses one connection per peer across topics, so a fresh 'connection' event
    // won't fire just because they're now vetted.
    const existingConn = connectionsByPeerKey.get(peerKeyHex)
    if (existingConn) {
      gatedStore.replicate(existingConn)
    }
  }

  // `courseId` is the course's own (local) id; `publicId` the one its code is
  // derived from (identity-keys.cjs).
  // `makeKeyPair`: courseKeyPair, or programKeyPair for a program (SLJ-32),
  // whose entry id is PROGRAM_ENTRY_PREFIX + its id.
  async function openPublishedDrive(courseId, publicId, makeKeyPair = courseKeyPair) {
    const existing = publishedDrives.get(courseId)
    if (existing?.writable) {
      return existing
    }

    // Each course has its own key pair, derived from the identity (never the
    // identity's own key, reused across independent logs). Per course, not per
    // version, so the drive key (the code students use) never changes.
    const keyPair = makeKeyPair(requireIdentity(), publicId)
    const cores = await openCourseCores(keyPair.publicKey)
    if (existing) await closePublishedDrive(courseId)

    // The key pair goes to a session only (Hyperdrive's `_db`), never into the
    // store. The blobs core follows the db core's key pair. A core opened by its
    // key alone first (a course brought back from students, SLJ-54) continues
    // the same history: a session with the key pair can write to it.
    let drive
    try {
      drive = new Hyperdrive(store.session(), {
        _db: new Hyperbee(store.get({ exclusive: true, key: cores.key, keyPair }), DRIVE_DB_OPTIONS),
      })
      await drive.ready()
    } finally {
      await cores.close()
    }

    // A fresh course has nothing to download, so client discovery is unnecessary here
    // — but keep seeding it for as long as this worker process runs.
    const discovery = swarm.join(drive.discoveryKey, { server: true, client: false })
    const entry = { discovery, drive, writable: true }
    publishedDrives.set(courseId, entry)
    return entry
  }

  // Makes `drive` hold exactly the files under `coursePath`, plus source.json.
  // mirror-drive's own pruning would delete source.json on every run (it isn't in
  // the version folder) and re-adding it would grow the drive on every app start,
  // so prune by hand and leave source.json alone.
  async function mirrorVersionIntoDrive(coursePath, drive) {
    const local = new Localdrive(coursePath)
    await local.mirror(drive, { prune: false }).done()

    for await (const entry of drive.list('/')) {
      if (entry.key === SOURCE_FILE_KEY) continue
      if (!(await local.entry(entry.key))) {
        await drive.del(entry.key)
      }
    }
  }

  // `kind`: "program" for a program's drive (SLJ-32); a course's says nothing.
  // `publisherName`: the teacher's Publisher name, if they give one; only a
  // claim, shown next to the Publisher ID. `channelCode`: the channel a
  // course is shown on (SLJ-31), true once the channel lists it back.
  async function writeSourceFile(drive, publicId, kind, publisherName, channelCode) {
    const creator = creatorKeyPair(requireIdentity())
    const name = typeof publisherName === 'string' ? publisherName.trim() : ''
    const channel = typeof channelCode === 'string' && /^[a-z0-9]{52,64}$/i.test(channelCode) ? channelCode : null
    const source = Buffer.from(
      JSON.stringify(
        {
          ...(channel ? { channel: { driveKey: channel } } : {}),
          driveKey: IdEncoding.normalize(drive.key),
          ...(kind ? { kind } : {}),
          publicId,
          publisher: { id: IdEncoding.normalize(creator.publicKey), ...(name ? { name } : {}) },
        },
        null,
        2,
      ),
    )
    const current = await drive.get(SOURCE_FILE_KEY)

    if (!current || !current.equals(source)) {
      await drive.put(SOURCE_FILE_KEY, source)
    }
  }

  // `publicIndex`: the course's number among this publisher's courses, given
  // by main at its first Publish; its public id (and so its code) follows.
  async function publishCourse(courseId, coursePath, publicIndex, publisherName, channelCode) {
    const publicId = publicCourseId(requireIdentity(), publicIndex)
    const { discovery, drive } = await openPublishedDrive(courseId, publicId)

    await mirrorVersionIntoDrive(coursePath, drive)
    await writeSourceFile(drive, publicId, undefined, publisherName, channelCode)
    await discovery.flushed()

    return { drive, publicId }
  }

  // A program (SLJ-32): its folder (program.json and its images) into its own
  // drive, signed by a key pair from the identity and its program number, so
  // its code never changes.
  async function publishProgram(programId, programPath, publicIndex, publisherName) {
    const publicId = publicProgramId(requireIdentity(), publicIndex)
    const { discovery, drive } = await openPublishedDrive(PROGRAM_ENTRY_PREFIX + programId, publicId, programKeyPair)

    await mirrorVersionIntoDrive(programPath, drive)
    await writeSourceFile(drive, publicId, 'program', publisherName)
    // Announced in the background: offline, it only completes later, and the
    // curator gets the code at once.
    discovery.flushed().catch(() => {})

    return { drive, publicId }
  }

  // A course's course.json and source.json by its code, without importing it
  // (a program's curator adding someone else's course, SLJ-32). From a drive
  // already open here when there is one: a second drive on the same key never
  // opens.
  async function peekCourse(driveKey) {
    const keyHex = IdEncoding.decode(driveKey).toString('hex')
    const open =
      followedDrives.get(keyHex)?.drive ??
      [...publishedDrives.values()].find((entry) => entry.drive.key.toString('hex') === keyHex)?.drive
    const drive = open ?? new Hyperdrive(store.session(), driveKey)

    try {
      await drive.ready()
      if (!open) {
        const done = drive.findingPeers()
        swarm.join(drive.discoveryKey, { client: true, server: false })
        swarm.flush().then(done, done)
      }
      // Nothing to read until a peer has sent the drive's first blocks.
      const deadline = Date.now() + PEEK_TIMEOUT_MS
      while (drive.core.length === 0 && Date.now() < deadline) {
        if (drive.core.peers.length > 0) {
          await withTimeout(drive.update({ wait: true }), Math.max(deadline - Date.now(), 1), 'NOT_FOUND').catch(() => {})
        } else {
          await new Promise((resolve) => setTimeout(resolve, 250))
        }
      }
      if (drive.core.length === 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })

      const read = (key) => withTimeout(drive.get(key), Math.max(deadline - Date.now(), 1_000), 'NOT_FOUND')
      const manifestBuffer = await read('/course.json')
      if (!manifestBuffer) throw new Error('This code is not a course')
      const manifest = JSON.parse(manifestBuffer.toString())
      const sourceBuffer = await read(SOURCE_FILE_KEY).catch(() => null)
      const source = sourceBuffer ? JSON.parse(sourceBuffer.toString()) : null
      if (!isValidCourseId(manifest.id)) throw new Error('This code is not a course')
      return { manifest, publisherId: typeof source?.publisher?.id === 'string' ? source.publisher.id : null }
    } finally {
      if (!open) {
        await swarm.leave(drive.discoveryKey).catch(() => {})
        await drive.close().catch(() => {})
      }
    }
  }

  function notifyDriveChanged(drive) {
    if (!rpc) return
    const request = rpc.request(EVENT_DRIVE_CHANGED)
    request.send(JSON.stringify({ driveKey: IdEncoding.normalize(drive.key) }))
    request.reply().catch(() => {})
  }

  // A followed drive changed when the teacher's new version reaches us ('append'),
  // or may have when a peer connects (we might have been offline). Main checks.
  function watchFollowedDrive(drive) {
    drive.core.on('append', () => notifyDriveChanged(drive))
    drive.core.on('peer-add', () => {
      drive
        .update({ wait: true })
        .then((changed) => changed && notifyDriveChanged(drive))
        .catch(() => {})
    })
  }

  setInterval(() => {
    for (const { drive } of followedDrives.values()) {
      drive
        .update()
        .then((changed) => changed && notifyDriveChanged(drive))
        .catch(() => {})
    }
  }, UPDATE_POLL_INTERVAL_MS)

  function withTimeout(promise, ms, message) {
    let timer
    return Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
      }),
    ]).finally(() => clearTimeout(timer))
  }

  async function readRemoteJson(drive, key) {
    const buffer = await withTimeout(
      drive.get(key),
      REMOTE_READ_TIMEOUT_MS,
      `Timed out reading ${key} from the course's peers`,
    )
    return buffer ? JSON.parse(buffer.toString()) : null
  }

  function getFollowedDrive(driveKey) {
    const entry = followedDrives.get(IdEncoding.decode(driveKey).toString('hex'))
    if (!entry) {
      throw new Error('This course is not followed on this device')
    }
    return entry.drive
  }

  // What the drive offers now: just the small files that say which version it
  // is and what changed (no lessons or assets are downloaded here).
  async function checkUpdate(driveKey) {
    const drive = getFollowedDrive(driveKey)
    await drive.update()

    const manifest = await readRemoteJson(drive, '/course.json')
    const changelog = await readRemoteJson(drive, '/changelog.json')
    const source = await readRemoteJson(drive, SOURCE_FILE_KEY)

    return {
      changelog: Array.isArray(changelog) ? changelog : [],
      courseId: manifest?.id ?? null,
      // The drive it continues in, if the course moved (SLJ-11).
      movedTo: source ? movedToKey(JSON.stringify(source), drive.key) : null,
      source,
      version: manifest?.version ?? null,
    }
  }

  // Mirrors the drive onto `targetPath`, a hardlinked copy of the student's
  // current course made by main. Only new, changed or removed files are written:
  // unchanged files are skipped by mirror-drive, and their blocks are already in
  // this Corestore. `atomic: true` is essential: Localdrive otherwise rewrites an
  // existing file in place (O_TRUNC), which on a hardlink would also change the
  // live course; atomic writes go to a temp file and rename over the link.
  async function downloadUpdate(driveKey, targetPath, transferId) {
    const drive = getFollowedDrive(driveKey)
    const transfer = createTransfer(transferId)
    transfer.drive = drive
    // Cancel stops waiting at once (`untilCancelled`) and main removes the
    // staging folder. The followed drive isn't closed (it keeps sharing the
    // course), so a block already being fetched may still arrive; it only fills
    // this Corestore's cache. A second Hyperdrive instance on the same key, to
    // close on cancel instead, never became ready (2026-10-05).

    try {
      await untilCancelled(transfer, drive.update())
      // Files the installed version already has (same hash in both versions'
      // version-meta.json) are left as they are, never compared by streaming:
      // on a drive this device never downloaded (a moved course's new one),
      // comparing would fetch every unchanged file.
      const remoteMeta = await untilCancelled(transfer, drive.get('/version-meta.json'))
      const localMeta = await fsp.readFile(path.join(targetPath, 'version-meta.json'), 'utf8').catch(() => null)
      const unchanged = unchangedFileKeys(remoteMeta ? remoteMeta.toString() : null, localMeta)
      const filter = unchanged.size > 0 ? (key) => !unchanged.has(key) : null
      const changedFiles = await mirrorWithProgress(drive, new Localdrive(targetPath, { atomic: true }), transfer, filter)
      finishTransfer(transferId, transfer, 'done')
      clearOldVersionsSoon(drive)
      return { changedFiles }
    } catch (error) {
      finishTransfer(transferId, transfer, transfer.isCancelled ? 'cancelled' : 'error')
      throw transfer.isCancelled ? new TransferCancelled() : error
    }
  }

  // At startup, an imported course's drive is reopened and announced again, so
  // students keep sharing it with each other (and, in SLJ-9 part 2, see updates).
  // Its blocks are already in this Corestore; nothing is downloaded here.
  async function followCourse(driveKey) {
    const keyHex = IdEncoding.decode(driveKey).toString('hex')
    if (followedDrives.has(keyHex)) {
      return
    }

    // A session, not `store`: unfollowing (a removed course) closes this drive,
    // and a Hyperdrive closes the Corestore it was given (see importCourse).
    const drive = new Hyperdrive(store.session(), driveKey)
    await drive.ready()
    // Server + client, the same "leech becomes a seed" default as importCourse. Not
    // awaiting `flushed()`: offline, the announce only completes later, and nothing
    // here waits on it. Until the first lookup is done the drive is "finding
    // peers", so `update()` (here and in checkUpdate) waits for them instead of
    // answering from the local copy, which would miss a version published while
    // this device was off.
    const doneFindingPeers = drive.findingPeers()
    const discovery = swarm.join(drive.discoveryKey)
    swarm.flush().then(doneFindingPeers, doneFindingPeers)
    followedDrives.set(keyHex, { discovery, drive })
    watchFollowedDrive(drive)
    drive
      .update()
      .then((changed) => changed && notifyDriveChanged(drive))
      .catch(() => {})
    clearOldVersionsSoon(drive, { oncePerRun: true })
  }

  // How many peers this device is connected to for a course it shares: your
  // own (by course id) or an imported one (by drive key). Null when it isn't
  // shared here right now.
  function countPeers({ courseId, driveKey }) {
    const entry = courseId
      ? publishedDrives.get(courseId)
      : followedDrives.get(IdEncoding.decode(driveKey).toString('hex'))
    return entry ? entry.drive.core.peers.length : null
  }

  async function stopSharing({ courseId, driveKey }) {
    if (courseId) {
      await closePublishedDrive(courseId)
      return
    }

    const key = IdEncoding.decode(driveKey).toString('hex')
    const entry = followedDrives.get(key)

    if (!entry) {
      return
    }

    followedDrives.delete(key)
    await swarm.leave(entry.drive.discoveryKey)
    await entry.drive.close()
  }

  // ─── Transfers (SLJ-43) ─────────────────────────────────────────────────
  // An import or an update download, tracked under an id the caller chooses, so
  // main can poll its progress (CMD_GET_TRANSFER) and cancel it
  // (CMD_CANCEL_TRANSFER). Phases: "finding" (no peer with the data yet: it
  // waits, it never gives up by itself), "downloading", then "done" /
  // "cancelled" / "error". The total is exact and known before downloading.
  const transfers = new Map() // id -> transfer

  class TransferCancelled extends Error {
    constructor() {
      super('Cancelled')
      this.code = 'CANCELLED'
    }
  }

  function createTransfer(id) {
    let rejectCancel
    const cancelled = new Promise((resolve, reject) => {
      rejectCancel = reject
    })
    cancelled.catch(() => {})
    const transfer = {
      bytesDone: 0,
      bytesTotal: null,
      cancel: () => {
        transfer.isCancelled = true
        rejectCancel(new TransferCancelled())
        for (const onCancel of transfer.onCancel) onCancel()
      },
      cancelled,
      // The course's title per language, once its course.json has arrived
      // (imports only), so Home can name the download.
      course: null,
      drive: null,
      finishedAt: null,
      isCancelled: false,
      mirror: null,
      onCancel: new Set(),
      phase: 'finding',
      startedAt: Date.now(),
      written: 0,
    }
    if (id) transfers.set(id, transfer)
    return transfer
  }

  function finishTransfer(id, transfer, phase) {
    transfer.phase = phase
    transfer.finishedAt = Date.now()
    if (id) setTimeout(() => transfers.delete(id), FINISHED_TRANSFER_TTL_MS)
  }

  // Waits for `promise`, unless the transfer is cancelled first.
  function untilCancelled(transfer, promise) {
    return Promise.race([promise, transfer.cancelled])
  }

  function transferSnapshot(transfer) {
    const downloaded = transfer.mirror ? transfer.mirror.downloadedBytes || 0 : 0
    const bytesDone =
      transfer.bytesTotal === null
        ? 0
        : Math.min(transfer.bytesTotal, Math.max(transfer.written, downloaded))
    const hasPeers = transfer.drive ? transfer.drive.core.peers.length > 0 : false
    // Still waiting for a peer that has the data: "finding", even mid-download.
    const phase =
      transfer.phase === 'downloading' && !hasPeers && bytesDone < (transfer.bytesTotal || 0)
        ? 'finding'
        : transfer.phase
    let speed = 0
    try {
      speed = transfer.mirror && transfer.mirror.downloadSpeed ? transfer.mirror.downloadSpeed() : 0
    } catch {}

    return {
      bytesDone: phase === 'done' ? transfer.bytesTotal || 0 : bytesDone,
      bytesTotal: transfer.bytesTotal,
      course: transfer.course,
      elapsedMs: (transfer.finishedAt || Date.now()) - transfer.startedAt,
      phase,
      speed,
    }
  }

  // An import: wait until a peer that has the course is connected and the
  // drive's file list has arrived (a fresh drive is empty until then).
  async function waitForDriveData(drive, transfer) {
    while (drive.core.length === 0) {
      if (drive.core.peers.length > 0) {
        await untilCancelled(transfer, drive.update({ wait: true }))
        if (drive.core.length > 0) return
      }
      await untilCancelled(
        transfer,
        new Promise((resolve) => {
          const timer = setTimeout(done, 2000)
          function done() {
            clearTimeout(timer)
            drive.core.off('peer-add', done)
            resolve()
          }
          drive.core.on('peer-add', done)
        }),
      )
    }
  }

  async function blobSize(drive, key) {
    const entry = await drive.entry(key)
    return entry && entry.value.blob ? entry.value.blob.byteLength : 0
  }

  // Mirrors `drive` onto `local`, tracking progress on `transfer`, cancellable.
  // The total counts only what will be written: every file for an import, the
  // added and changed files for an update.
  // `filter`: drive paths to leave alone (see unchangedFileKeys).
  async function mirrorWithProgress(drive, local, transfer, filter = null) {
    let total = 0
    const plan = drive.mirror(local, { dryRun: true, filter })
    for await (const diff of plan) {
      if (transfer.isCancelled) throw new TransferCancelled()
      if (diff.op === 'add' || diff.op === 'change') total += await blobSize(drive, diff.key)
    }
    transfer.bytesTotal = total
    transfer.phase = 'downloading'

    const mirror = drive.mirror(local, { filter, progress: true })
    transfer.mirror = mirror
    const changedFiles = []
    const iterator = mirror[Symbol.asyncIterator]()

    while (true) {
      const { done, value } = await untilCancelled(transfer, iterator.next())
      if (done) break
      changedFiles.push({ key: value.key, op: value.op })
      if (value.op === 'add' || value.op === 'change') {
        transfer.written += await blobSize(drive, value.key)
      }
    }

    return changedFiles
  }

  // A real import only ever has the code (the driveKey/invite) — it doesn't know the
  // shared course's real id in advance, only whoever published it does. Mirror into a
  // staging directory first, then discover the id from the fetched course.json, and
  // land it as a course root of its own (no draft/ wrapper — the same shape the
  // bundled seed course already uses for "finished content you consume, not author").
  async function finalizeImportedCourse(stagingPath, coursesRoot, driveKey) {
    let courseId
    let publisherId

    try {
      publisherId = await readVerifiedSource(stagingPath, driveKey)

      const manifestPath = path.join(stagingPath, 'course.json')
      const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'))
      courseId = manifest.id

      if (!courseId) {
        throw new Error('course.json is missing an id')
      }

      // The id comes from a remote peer and is about to become a directory name
      // under coursesRoot — reject anything that isn't a plain slug before it
      // reaches a path operation.
      if (!isValidCourseId(courseId)) {
        throw new Error('course.json has an invalid id')
      }

      // A published version's own snapshot manifest still says status: "draft" — a
      // copy-time artifact from when it was cut (see docs/persistence-notes.md) that
      // nothing reads while it stays inside versions/. Landing it at the course root
      // with that same status would make it show up in Drafts instead of My Courses,
      // even though there's no draft/ directory backing it — patch it before it lands.
      await fsp.writeFile(
        manifestPath,
        JSON.stringify({ ...manifest, status: 'published' }, null, 2),
      )
    } catch (error) {
      await fsp.rm(stagingPath, { recursive: true, force: true }).catch(() => {})
      throw error
    }

    const finalPath = path.join(coursesRoot, courseId)
    const alreadyExists = await fsp
      .stat(finalPath)
      .then(() => true)
      .catch(() => false)

    if (alreadyExists) {
      await fsp.rm(stagingPath, { recursive: true, force: true }).catch(() => {})
      throw new Error(`Course "${courseId}" is already imported`)
    }

    await fsp.rename(stagingPath, finalPath)
    return { courseId, publisherId }
  }

  // A program fetched into `stagingPath` lands as programs/<id>/ (SLJ-32).
  // Main validates program.json in full afterwards; here only what decides
  // where it goes: its id (a directory name from a remote peer) and format.
  async function finalizeImportedProgram(stagingPath, programsRoot, driveKey) {
    let programId
    let publisherId
    try {
      publisherId = await readVerifiedSource(stagingPath, driveKey)
      const manifest = JSON.parse(await fsp.readFile(path.join(stagingPath, 'program.json'), 'utf8'))
      if (typeof manifest.formatVersion !== 'number' || manifest.formatVersion > 1) {
        const error = new Error('This program was made with a newer version of Matko')
        error.code = 'NEWER_FORMAT'
        throw error
      }
      if (!isValidCourseId(manifest.id)) throw new Error('program.json has an invalid id')
      programId = manifest.id
    } catch (error) {
      await fsp.rm(stagingPath, { recursive: true, force: true }).catch(() => {})
      throw error
    }

    const finalPath = path.join(programsRoot, programId)
    if (await fsp.stat(finalPath).then(() => true, () => false)) {
      await fsp.rm(stagingPath, { recursive: true, force: true }).catch(() => {})
      throw new Error(`Program "${programId}" is already here`)
    }
    await fsp.rename(stagingPath, finalPath)
    return { programId, publisherId }
  }

  // See workers/course-source.cjs. Returns the claimed publisher id.
  async function readVerifiedSource(stagingPath, driveKey) {
    const sourceText = await fsp
      .readFile(path.join(stagingPath, 'source.json'), 'utf8')
      .catch(() => null)

    return verifySource(sourceText, driveKey)
  }

  function stagingPathFor(coursesRoot) {
    return path.join(coursesRoot, `.import-staging-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  }

  // The course's titles from the drive's course.json, for the download's
  // label. Remote data: only strings, capped. Null if it can't be read; the
  // import itself validates the manifest later.
  async function readCourseTitles(drive, transfer, manifestKey = '/course.json') {
    try {
      const manifest = JSON.parse(await untilCancelled(transfer, drive.get(manifestKey)))
      const titles = {}
      for (const [locale, entry] of Object.entries(manifest.locales || {})) {
        if (entry && typeof entry.title === 'string') titles[locale] = entry.title.slice(0, 200)
      }
      return {
        defaultLocale: typeof manifest.defaultLocale === 'string' ? manifest.defaultLocale : null,
        titles,
      }
    } catch (error) {
      if (transfer.isCancelled) throw error
      return null
    }
  }

  // `programsRoot`: where a program lands (SLJ-32): the code may be a
  // program's, told apart by the program.json its drive holds.
  // `hops`: "moved" notices followed so far (a moved course's old code leads
  // to its new one, SLJ-11).
  async function importCourse(driveKey, coursesRoot, transferId, programsRoot, hops = 0) {
    // Already here (imported, so followed): that course, at once. A second
    // drive on the same key would never open (a Hyperdrive holds its core
    // exclusively), and the import would wait forever, looking like nobody
    // was online.
    const alreadyFollowed = followedDrives.get(IdEncoding.decode(driveKey).toString('hex'))
    if (alreadyFollowed) {
      const program = await alreadyFollowed.drive.get('/program.json')
      if (program) {
        const manifest = JSON.parse(program)
        return { alreadyImported: true, driveKey: alreadyFollowed.drive.key, kind: 'program', programId: manifest.id, publisherId: '' }
      }
      const manifest = JSON.parse(await alreadyFollowed.drive.get('/course.json'))
      return { alreadyImported: true, courseId: manifest.id, driveKey: alreadyFollowed.drive.key, publisherId: '' }
    }

    const transfer = createTransfer(transferId)
    // A session, never `store` itself: closing a Hyperdrive closes the
    // Corestore it was given, and this drive is closed when an import fails
    // or is cancelled. Given `store`, that closed it for every later import
    // ("Corestore is closed") until the app restarted.
    const drive = new Hyperdrive(store.session(), driveKey)
    // Closing the drive aborts any read still waiting for a peer; Cancel works
    // from here on, opening included.
    transfer.onCancel.add(() => drive.close().catch(() => {}))
    try {
      await untilCancelled(transfer, drive.ready())
    } catch (error) {
      finishTransfer(transferId, transfer, transfer.isCancelled ? 'cancelled' : 'error')
      await drive.close().catch(() => {})
      throw transfer.isCancelled ? new TransferCancelled() : error
    }
    transfer.drive = drive
    const keyHex = drive.key.toString('hex')
    let stagingPath = null

    // No override: once this finishes, our Corestore holds a real replica, so we keep
    // announcing it (the default, server + client both true) rather than stopping
    // after download — the same "leech becomes a seed" convention that keeps the
    // swarm alive.
    const discovery = swarm.join(drive.discoveryKey)

    try {
      // Nobody with the course online: keep looking (the UI says so) until
      // someone is, or the student cancels.
      await waitForDriveData(drive, transfer)

      // A course that moved (now shared by several maintainers): import it
      // from where it continues, before downloading anything here.
      const sourceBuffer = await untilCancelled(transfer, drive.get(SOURCE_FILE_KEY))
      const movedTo = sourceBuffer ? movedToKey(sourceBuffer.toString(), drive.key) : null
      if (movedTo) {
        if (hops >= MAX_MOVED_HOPS) throw new Error('This course moved too many times to follow')
        await swarm.leave(drive.discoveryKey).catch(() => {})
        await drive.close().catch(() => {})
        return importCourse(movedTo, coursesRoot, transferId, programsRoot, hops + 1)
      }

      const isProgram = programsRoot && Boolean(await untilCancelled(transfer, drive.entry('/program.json')))
      transfer.course = await readCourseTitles(drive, transfer, isProgram ? '/program.json' : '/course.json')

      if (isProgram) {
        await fsp.mkdir(programsRoot, { recursive: true })
        stagingPath = stagingPathFor(programsRoot)
        await mirrorWithProgress(drive, new Localdrive(stagingPath), transfer)
        const { programId, publisherId } = await finalizeImportedProgram(stagingPath, programsRoot, drive.key)
        followedDrives.set(keyHex, { discovery, drive })
        watchFollowedDrive(drive)
        finishTransfer(transferId, transfer, 'done')
        return { driveKey: drive.key, kind: 'program', programId, publisherId }
      }

      stagingPath = stagingPathFor(coursesRoot)
      await mirrorWithProgress(drive, new Localdrive(stagingPath), transfer)

      const { courseId, publisherId } = await finalizeImportedCourse(stagingPath, coursesRoot, drive.key)
      followedDrives.set(keyHex, { discovery, drive })
      watchFollowedDrive(drive)
      finishTransfer(transferId, transfer, 'done')
      return { courseId, driveKey: drive.key, publisherId }
    } catch (error) {
      finishTransfer(transferId, transfer, transfer.isCancelled ? 'cancelled' : 'error')
      if (stagingPath) await fsp.rm(stagingPath, { recursive: true, force: true }).catch(() => {})
      // Don't keep seeding a course that didn't land.
      if (!followedDrives.has(keyHex)) {
        await swarm.leave(drive.discoveryKey).catch(() => {})
        await drive.close().catch(() => {})
      }
      throw transfer.isCancelled ? new TransferCancelled() : error
    }
  }

  async function publishGatedCourse(courseId, coursePath) {
    // Deliberately no swarm.join()/announce here, unlike the public path: a gated
    // drive's discoveryKey must stay unreachable via ordinary discovery. The only way
    // a peer ever gets connected is by successfully completing a blind-pairing
    // exchange first — there is no topic to blanket-serve.
    const drive = new Hyperdrive(gatedStore.namespace(`course-${courseId}`))
    await drive.ready()

    await mirrorVersionIntoDrive(coursePath, drive)
    await writeSourceFile(drive)

    return drive
  }

  function createInvite(courseId, driveKey, discoveryKey, expiresInMs, maxUses) {
    const invite = BlindPairing.createInvite(driveKey, {
      expires: expiresInMs ? Date.now() + expiresInMs : 0,
    })

    invites.set(invite.id.toString('hex'), {
      driveKey,
      expiresAt: invite.expires,
      invitePublicKey: invite.publicKey,
      maxUses: maxUses ?? Infinity,
      usedCount: 0,
    })

    const discoveryKeyHex = discoveryKey.toString('hex')
    if (!gatedMembers.has(discoveryKeyHex)) {
      gatedMembers.set(discoveryKeyHex, pairing.addMember({ discoveryKey, onadd: onGatedRequest }))
    }

    return invite.invite
  }

  async function redeemInvite(inviteBuffer, coursesRoot) {
    const candidate = pairing.addCandidate({
      invite: inviteBuffer,
      userData: swarmKeyPair.publicKey,
      onadd: () => {},
    })

    let result
    try {
      result = await new Promise((resolve, reject) => {
        candidate.request.once('rejected', reject)
        candidate.pairing.then(resolve, reject)
      })
    } finally {
      // Must run on both the success and failure paths — blind-pairing tracks one
      // "active candidate" per discoveryKey, so a rejected/expired redemption that's
      // never closed blocks every future attempt against the same course.
      await candidate.close()
    }

    const drive = new Hyperdrive(gatedStore, result.key)
    await drive.ready()

    // The generic swarm connection handler above always replicates the public `store`
    // for a peer it hasn't vetted — including the connection this very pairing just
    // happened over, since that handler ran before pairing resolved. Mirror the host's
    // own "upgrade this connection" step (see onGatedRequest) on our side too, or our
    // replication stream stays bound to the public store and can never actually fetch
    // a gatedStore-owned core, no matter what the host does on its end.
    for (const conn of connectionsByPeerKey.values()) {
      gatedStore.replicate(conn)
    }

    // Client-only: never announce/reseed gated content publicly, unlike a public
    // import — otherwise the first redeemer would make it universally discoverable
    // again, defeating the whole point of gating.
    const discovery = swarm.join(drive.discoveryKey, { server: false, client: true })
    await discovery.flushed()
    await swarm.flush()
    await drive.update()

    const stagingPath = stagingPathFor(coursesRoot)
    await drive.mirror(new Localdrive(stagingPath)).done()

    const { courseId, publisherId } = await finalizeImportedCourse(stagingPath, coursesRoot, drive.key)
    return { courseId, driveKey: drive.key, publisherId }
  }

  // ─── The publisher identity (SLJ-54, SLJ-55) ────────────────────────────
  // Main keeps the identity (in the OS keychain, or locked with a password in
  // the backup file's format) and hands it over in memory. The worker does the
  // cryptography: deriving keys, and sealing or opening a password-locked file.

  // Opens a backup file, or main's password-locked copy, with its password.
  // The key inside must be the identity the file's public part names.
  function openIdentity(text, password) {
    const opened = openIdentityBackup(text, password)
    if (IdEncoding.normalize(creatorKeyPair(opened.primaryKey).publicKey) !== opened.publisherId) {
      throw new IdentityBackupError('INVALID_FILE', 'This identity backup is damaged')
    }
    return opened
  }

  function publisherIdOf(key) {
    return IdEncoding.normalize(creatorKeyPair(key).publicKey)
  }

  // Restoring (SLJ-54/55): is this publisher's course number `index` online?
  // Derives its public id and code, looks for someone who has it for at most
  // `timeoutMs` (then NOT_FOUND: a gap, or nobody who has it is online), and
  // downloads its published version into `stagingPath`. The course's own id
  // comes from its course.json.
  //
  // The drive is opened by its key alone, never with its key pair:
  // a core opened with its key pair is "writable", and a writable core never asks
  // peers for a longer history. It would stay empty, and the next publish would
  // start a second history that students' apps refuse. Opened by key, it learns
  // the full history first; publishing (openPublishedDrive) then continues it.
  async function findCourse(index, stagingPath, transferId, timeoutMs) {
    const transfer = createTransfer(transferId)
    const publicId = publicCourseId(requireIdentity(), index)
    // Only the public key: the cores are created without a key pair (read-only).
    const cores = await openCourseCores(courseKeyPair(requireIdentity(), publicId).publicKey)
    const drive = new Hyperdrive(store.session(), cores.key)
    await drive.ready()
    await cores.close()
    transfer.drive = drive
    // Until the first lookup is done, update() waits for peers instead of
    // answering from the (empty) local copy.
    // Client only: there's nothing to offer yet, and announcing many numbers at
    // once only slows the lookups down. Publishing announces it later.
    const doneFindingPeers = drive.findingPeers()
    const discovery = swarm.join(drive.discoveryKey, { client: true, server: false })
    discovery.flushed().then(doneFindingPeers, doneFindingPeers)
    transfer.onCancel.add(() => drive.close().catch(() => {}))
    const timer = setTimeout(() => {
      if (drive.core.length === 0) {
        transfer.notFound = true
        transfer.cancel()
      }
    }, timeoutMs)

    try {
      await waitForDriveData(drive, transfer)
      clearTimeout(timer)
      // The newest version any connected peer has.
      await untilCancelled(transfer, drive.update({ wait: true }))
      transfer.course = await readCourseTitles(drive, transfer)
      await mirrorWithProgress(drive, new Localdrive(stagingPath), transfer)

      const manifest = JSON.parse(await fsp.readFile(path.join(stagingPath, 'course.json'), 'utf8'))
      if (!isValidCourseId(manifest.id)) {
        throw new Error('course.json has an invalid id')
      }
      const publisherId = await readVerifiedSource(stagingPath, drive.key)
      // It moved to a course shared by several maintainers (SLJ-11): restore
      // follows it there.
      const sourceText = await fsp.readFile(path.join(stagingPath, 'source.json'), 'utf8').catch(() => null)
      const movedTo = sourceText ? movedToKey(sourceText, drive.key) : null

      finishTransfer(transferId, transfer, 'done')
      return { courseId: manifest.id, driveKey: drive.key, movedTo, publicId, publisherId, version: manifest.version }
    } catch (error) {
      finishTransfer(transferId, transfer, transfer.isCancelled ? 'cancelled' : 'error')
      if (transfer.notFound) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
      throw transfer.isCancelled ? new TransferCancelled() : error
    } finally {
      clearTimeout(timer)
      // Sharing it again is publishing's job, with the key pair (openPublishedDrive).
      await swarm.leave(drive.discoveryKey).catch(() => {})
      await drive.close().catch(() => {})
    }
  }

  // Restoring (SLJ-32): this publisher's program number `index`, like
  // findCourse. Downloads the program's folder into `stagingPath`.
  async function findProgram(index, stagingPath, transferId, timeoutMs) {
    const transfer = createTransfer(transferId)
    const publicId = publicProgramId(requireIdentity(), index)
    const cores = await openCourseCores(programKeyPair(requireIdentity(), publicId).publicKey)
    const drive = new Hyperdrive(store.session(), cores.key)
    await drive.ready()
    await cores.close()
    transfer.drive = drive
    const doneFindingPeers = drive.findingPeers()
    const discovery = swarm.join(drive.discoveryKey, { client: true, server: false })
    discovery.flushed().then(doneFindingPeers, doneFindingPeers)
    transfer.onCancel.add(() => drive.close().catch(() => {}))
    const timer = setTimeout(() => {
      if (drive.core.length === 0) {
        transfer.notFound = true
        transfer.cancel()
      }
    }, timeoutMs)

    try {
      await waitForDriveData(drive, transfer)
      clearTimeout(timer)
      await untilCancelled(transfer, drive.update({ wait: true }))
      transfer.course = await readCourseTitles(drive, transfer, '/program.json')
      await mirrorWithProgress(drive, new Localdrive(stagingPath), transfer)

      const manifest = JSON.parse(await fsp.readFile(path.join(stagingPath, 'program.json'), 'utf8'))
      if (!isValidCourseId(manifest.id)) {
        throw new Error('program.json has an invalid id')
      }
      const publisherId = await readVerifiedSource(stagingPath, drive.key)

      finishTransfer(transferId, transfer, 'done')
      return { driveKey: drive.key, programId: manifest.id, publicId, publisherId }
    } catch (error) {
      finishTransfer(transferId, transfer, transfer.isCancelled ? 'cancelled' : 'error')
      if (transfer.notFound) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
      throw transfer.isCancelled ? new TransferCancelled() : error
    } finally {
      clearTimeout(timer)
      await swarm.leave(drive.discoveryKey).catch(() => {})
      await drive.close().catch(() => {})
    }
  }

  // ─── Courses shared by several maintainers (SLJ-11) ──────────────────────
  // workers/shared-course.cjs (the shared course: propose, review, sign,
  // commit) and workers/maintainers.cjs (invites and mailboxes). Main decides
  // when (electron/maintainers.ts); this only carries the operations out.

  function notifyMain(event, payload) {
    if (!rpc) return
    const request = rpc.request(event)
    request.send(JSON.stringify(payload))
    request.reply().catch(() => {})
  }

  const maintainers = createMaintainers({
    identity: () => identity,
    onJoined: (joined) => notifyMain(EVENT_MAINTAINER_JOINED, joined),
    onMailboxChanged: (key) => notifyMain(EVENT_DRIVE_CHANGED, { driveKey: key }),
    pairing,
    store,
    swarm,
  })
  const proposalDrives = new Map() // hex proposal key -> our proposal drive
  const sharedDrives = new Map() // hex shared key -> the shared course's drive

  // The shared course's drive, opened once: announced, and reported to main
  // when a new version lands (like a followed course).
  async function ensureSharedDrive(spec) {
    const hex = sharedCourseKey(spec).toString('hex')
    const existing = sharedDrives.get(hex)
    if (existing) return existing
    const drive = await openSharedDrive(store, spec)
    swarm.join(drive.discoveryKey, { client: true, server: true })
    watchFollowedDrive(drive)
    sharedDrives.set(hex, drive)
    keepFullCopy(drive)
    drive.core.on('append', () => keepFullCopy(drive))
    return drive
  }

  // Every maintainer keeps the whole shared course, its history included
  // (both cores, every block): a proposal starts with a copy of all of it
  // (createProposal), and a version's files alone don't hold old blocks. With
  // only a restored computer's copy of the latest files, nobody could
  // propose once the computers that had the history are gone. Started once
  // per drive; the blobs only exist once it has a version.
  const fullCopies = new WeakSet()
  function keepFullCopy(drive) {
    if (fullCopies.has(drive) || drive.core.length === 0) return
    fullCopies.add(drive)
    drive.core.download({ start: 0, end: -1 })
    drive.getBlobs().then((blobs) => blobs.core.download({ start: 0, end: -1 }), () => {})
  }

  async function closeSharedDrive(spec) {
    const hex = sharedCourseKey(spec).toString('hex')
    const drive = sharedDrives.get(hex)
    if (!drive) return
    sharedDrives.delete(hex)
    await drive.close().catch(() => {})
  }

  async function sharedCourseOp(args) {
    const spec = args.spec ? sharedCourseSpec(args.spec) : null
    switch (args.op) {
      case 'self':
        return maintainers.self(args.publicId)
      case 'createInvite':
        return { code: await maintainers.createInvite(args.publicId, args.invitee) }
      case 'acceptInvite':
        return maintainers.acceptInvite(args.code)
      case 'writeMailbox':
        await maintainers.writeMailbox(args.publicId, args.file, args.value)
        return {}
      case 'followMailbox':
        await maintainers.followMailbox(args.key)
        return {}
      case 'readMailbox':
        return maintainers.readMailbox(args.key)
      case 'seedShared': {
        const drive = await ensureSharedDrive(spec)
        await drive.core.update().catch(() => {})
        const manifest = drive.core.length > 0 ? await readRemoteJson(drive, '/course.json').catch(() => null) : null
        return {
          courseId: manifest?.id ?? null,
          length: drive.core.length,
          sharedKey: IdEncoding.normalize(drive.key),
          version: manifest?.version ?? null,
        }
      }
      case 'propose': {
        const { drive, length, request, sharedLength } = await createProposal({
          identity: requireIdentity(),
          index: args.index,
          source: args.source,
          spec,
          store,
          versionPath: args.versionPath,
        })
        swarm.join(drive.discoveryKey, { client: true, server: true })
        proposalDrives.set(drive.key.toString('hex'), drive)
        return { hash: requestHash(request), length, proposalKey: IdEncoding.normalize(drive.key), request, sharedLength }
      }
      case 'review': {
        await ensureSharedDrive(spec)
        const { changes, length, proposal, sharedLength } = await openProposalForReview({
          proposalKey: args.proposalKey,
          request: args.request,
          spec,
          store,
        })
        // Its release notes (SLJ-67): the version's changelog.json, as its cut
        // wrote it. Written by the proposer's app, so the file list stays the
        // check; a small file, read with a time limit.
        let changelog = []
        try {
          const checkout = proposal.checkout(length)
          const text = await withTimeout(checkout.get('/changelog.json'), REMOTE_READ_TIMEOUT_MS, 'NO_CHANGELOG')
          await checkout.close()
          const parsed = text && text.byteLength <= 512 * 1024 ? JSON.parse(text) : []
          changelog = Array.isArray(parsed) ? parsed : []
        } catch {
          changelog = []
        }
        await proposal.close()
        return { changelog, changes, length, sharedLength }
      }
      case 'proposalState': {
        await ensureSharedDrive(spec)
        return { state: await proposalState({ request: args.request, spec, store }) }
      }
      case 'sign':
        return { response: signRequest({ identity: requireIdentity(), publicId: spec.publicId, request: args.request }) }
      case 'commit': {
        const proposal = proposalDrives.get(IdEncoding.decode(args.proposalKey).toString('hex'))
        if (!proposal) throw new Error('This proposal is not on this device')
        // The shared drive is reopened after: committing writes its cores.
        await closeSharedDrive(spec)
        try {
          await commitProposal({ first: args.first, proposal, request: args.request, responses: args.responses, spec, store })
        } finally {
          await ensureSharedDrive(spec)
        }
        return { sharedKey: IdEncoding.normalize(sharedCourseKey(spec)) }
      }
      // A proposal of ours is over (committed, withdrawn or replaced): stop
      // sharing it and delete its copy of the course's history (SLJ-111).
      case 'dropProposal': {
        const hex = IdEncoding.decode(args.proposalKey).toString('hex')
        const proposal = proposalDrives.get(hex) ?? null
        proposalDrives.delete(hex)
        if (proposal) await swarm.leave(proposal.discoveryKey).catch(() => {})
        const cleared = await purgeProposal({ drive: proposal, proposalKey: args.proposalKey, store })
        return { cleared }
      }
      // Our proposal still waiting, after a restart: opened again (read-only
      // is enough to commit it), so it can be committed here and reviewers
      // can fetch it.
      case 'openProposal': {
        const key = IdEncoding.decode(args.proposalKey)
        const hex = key.toString('hex')
        if (proposalDrives.has(hex)) return { opened: true }
        if (!(await hasProposal({ proposalKey: args.proposalKey, store }))) return { opened: false }
        const drive = new Hyperdrive(store.session(), key)
        await drive.ready()
        swarm.join(drive.discoveryKey, { client: true, server: true })
        proposalDrives.set(hex, drive)
        return { opened: true }
      }
      case 'moveNotice': {
        const { drive } = await openPublishedDrive(args.courseId, args.publicId)
        await writeMovedNotice(drive, args.sharedKey)
        return {}
      }
      // A shared course by its key alone (restoring: its signers and rule are
      // in its source.json): who maintains it, and its id, title and version.
      case 'readSharedSource': {
        // Already open here: a second Hyperdrive on it would never be ready.
        const open = sharedDrives.get(IdEncoding.decode(args.sharedKey).toString('hex'))
        const drive = open ?? new Hyperdrive(store.session(), IdEncoding.decode(args.sharedKey))
        try {
          await drive.ready()
          const found = drive.findingPeers()
          swarm.join(drive.discoveryKey, { client: true, server: false })
          swarm.flush().then(found, found)
          await withTimeout(drive.update({ wait: true }), REMOTE_READ_TIMEOUT_MS, 'Nobody sharing this course is online')
          const source = await readRemoteJson(drive, SOURCE_FILE_KEY)
          const manifest = await readRemoteJson(drive, '/course.json')
          const title = manifest?.locales?.[manifest?.defaultLocale]?.title
          return {
            courseId: manifest?.id ?? null,
            // Where it continues, if its maintainers changed since (SLJ-70).
            movedTo: source ? movedToKey(JSON.stringify(source), drive.key) : null,
            source,
            title: typeof title === 'string' ? title.slice(0, 200) : null,
            version: manifest?.version ?? null,
          }
        } finally {
          if (!open) await drive.close().catch(() => {})
        }
      }
      // A proposed version, as files (SLJ-67, "Preview as student"):
      // `stagingPath` already holds a hardlinked copy of the version this
      // device has (main makes it, or it's empty), so only files whose
      // version-meta.json hash differs come over the network. Written
      // atomically, so the hardlinked files are replaced, never changed.
      case 'downloadProposal': {
        const proposal = new Hyperdrive(store.session(), IdEncoding.decode(args.proposalKey))
        try {
          await proposal.ready()
          await withTimeout(proposal.core.update({ wait: true }), REMOTE_READ_TIMEOUT_MS, 'Nobody sharing this version is online')
          const version = proposal.checkout(args.length)
          try {
            const remoteMeta = await withTimeout(version.get('/version-meta.json'), REMOTE_READ_TIMEOUT_MS, 'NO_META').catch(() => null)
            const localMeta = await fsp.readFile(path.join(args.stagingPath, 'version-meta.json'), 'utf8').catch(() => null)
            const unchanged = unchangedFileKeys(remoteMeta ? remoteMeta.toString() : null, localMeta)
            await version
              .mirror(new Localdrive(args.stagingPath, { atomic: true }), {
                filter: (key) => key !== SOURCE_FILE_KEY && !unchanged.has(key),
              })
              .done()
          } finally {
            await version.close()
          }
          const manifest = JSON.parse(await fsp.readFile(path.join(args.stagingPath, 'course.json'), 'utf8'))
          if (!isValidCourseId(manifest.id)) throw new Error('course.json has an invalid id')
          return { courseId: manifest.id, version: manifest.version }
        } finally {
          await proposal.close().catch(() => {})
        }
      }
      case 'downloadShared': {
        const drive = await ensureSharedDrive(spec)
        await withTimeout(drive.core.update({ wait: true }), REMOTE_READ_TIMEOUT_MS, 'Nobody sharing this course is online')
        await drive.mirror(new Localdrive(args.stagingPath)).done()
        const manifest = JSON.parse(await fsp.readFile(path.join(args.stagingPath, 'course.json'), 'utf8'))
        return { courseId: manifest.id, version: manifest.version }
      }
      default:
        throw new Error(`Unknown shared course operation "${args.op}"`)
    }
  }

  rpc = new RPC(new Pipe(3), async (req) => {
    // The publisher id while the identity is unlocked here, else ''. Main asks
    // it once at start to know the worker answers (scripts/check-packaged.mjs).
    if (req.command === CMD_GET_CREATOR_KEY) {
      req.reply(identity ? publisherIdOf(identity) : '')
      return
    }

    if (req.command === CMD_SET_IDENTITY) {
      try {
        const { key } = JSON.parse(req.data.toString())
        const next = key ? Buffer.from(key, 'base64') : null
        if (next && next.length !== 32) throw new Error('The identity key must be 32 bytes')
        if (identity) identity.fill(0)
        identity = next
        req.reply(JSON.stringify({ publisherId: identity ? publisherIdOf(identity) : null }))
      } catch (error) {
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    // Main's password-locked copy of the identity: the backup file's format
    // with no courses in it.
    if (req.command === CMD_SEAL_IDENTITY) {
      try {
        const { key, password } = JSON.parse(req.data.toString())
        const primaryKey = Buffer.from(key, 'base64')
        const sealed = createIdentityBackup({ courses: [], password, primaryKey, publisherId: publisherIdOf(primaryKey) })
        primaryKey.fill(0)
        req.reply(JSON.stringify({ sealed }))
      } catch (error) {
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_OPEN_IDENTITY) {
      try {
        const { password, text } = JSON.parse(req.data.toString())
        const opened = openIdentity(text, password)
        req.reply(
          JSON.stringify({
            courses: opened.courses,
            key: opened.primaryKey.toString('base64'),
            publisherId: opened.publisherId,
          }),
        )
        opened.primaryKey.fill(0)
      } catch (error) {
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_SEED_COURSE) {
      try {
        const { courseId, driveKey } = JSON.parse(req.data.toString())
        if (!isValidCourseId(courseId)) throw new Error('Invalid course id')
        const { discovery } = await seedPublishedDrive(courseId, driveKey)
        await discovery.flushed()
        req.reply(JSON.stringify({}))
      } catch (error) {
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_PUBLISH_PROGRAM) {
      const { programId, programPath, publicIndex, publisherName } = JSON.parse(req.data.toString())
      try {
        if (!isValidCourseId(programId)) throw new Error('Invalid program id')
        const { drive, publicId } = await publishProgram(programId, programPath, publicIndex, publisherName)
        req.reply(JSON.stringify({ driveKey: IdEncoding.normalize(drive.key), publicId }))
      } catch (error) {
        if (error.code !== 'LOCKED') console.error('[worker] failed to publish program:', error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_SEED_PROGRAM) {
      try {
        const { programId, driveKey } = JSON.parse(req.data.toString())
        if (!isValidCourseId(programId)) throw new Error('Invalid program id')
        const { discovery } = await seedPublishedDrive(PROGRAM_ENTRY_PREFIX + programId, driveKey)
        await discovery.flushed()
        req.reply(JSON.stringify({}))
      } catch (error) {
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_PEEK_COURSE) {
      try {
        const { driveKey } = JSON.parse(req.data.toString())
        req.reply(JSON.stringify(await peekCourse(driveKey)))
      } catch (error) {
        const notFound = error.code === 'NOT_FOUND' || error.message === 'NOT_FOUND'
        req.reply(JSON.stringify({ code: notFound ? 'NOT_FOUND' : 'ERROR', error: error.message }))
      }
      return
    }

    if (req.command === CMD_PUBLISH_COURSE) {
      const { channelCode, courseId, coursePath, publicIndex, publisherName } = JSON.parse(req.data.toString())

      try {
        const { drive, publicId } = await publishCourse(courseId, coursePath, publicIndex, publisherName, channelCode)
        req.reply(JSON.stringify({ driveKey: IdEncoding.normalize(drive.key), publicId }))
      } catch (error) {
        if (error.code !== 'LOCKED') console.error('[worker] failed to publish course:', error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_IMPORT_COURSE) {
      const { driveKey, coursesRoot, programsRoot, transferId } = JSON.parse(req.data.toString())

      try {
        const result = await importCourse(driveKey, coursesRoot, transferId, programsRoot)
        req.reply(
          JSON.stringify({
            alreadyImported: result.alreadyImported === true,
            courseId: result.courseId,
            kind: result.kind ?? 'course',
            programId: result.programId,
            driveKey: IdEncoding.normalize(result.driveKey),
            publisherId: result.publisherId,
          }),
        )
      } catch (error) {
        if (error.code !== 'CANCELLED') console.error('[worker] failed to import course:', error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_PUBLISH_GATED_COURSE) {
      const { courseId, coursePath } = JSON.parse(req.data.toString())

      try {
        const drive = await publishGatedCourse(courseId, coursePath)
        req.reply(
          JSON.stringify({
            discoveryKey: drive.discoveryKey.toString('base64'),
            driveKey: IdEncoding.normalize(drive.key),
          }),
        )
      } catch (error) {
        console.error('[worker] failed to publish gated course:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_CREATE_INVITE) {
      const { courseId, discoveryKey, driveKey, expiresInMs, maxUses } = JSON.parse(
        req.data.toString(),
      )

      try {
        const invite = createInvite(
          courseId,
          IdEncoding.decode(driveKey),
          Buffer.from(discoveryKey, 'base64'),
          expiresInMs,
          maxUses,
        )
        req.reply(JSON.stringify({ invite: invite.toString('base64') }))
      } catch (error) {
        console.error('[worker] failed to create invite:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_REDEEM_INVITE) {
      const { invite, coursesRoot } = JSON.parse(req.data.toString())

      try {
        const result = await redeemInvite(Buffer.from(invite, 'base64'), coursesRoot)
        req.reply(
          JSON.stringify({
            courseId: result.courseId,
            driveKey: IdEncoding.normalize(result.driveKey),
            publisherId: result.publisherId,
          }),
        )
      } catch (error) {
        console.error('[worker] failed to redeem invite:', error)
        req.reply(JSON.stringify({ error: error.message, code: error.code }))
      }
      return
    }

    if (req.command === CMD_FOLLOW_COURSE) {
      const { driveKey } = JSON.parse(req.data.toString())

      try {
        await followCourse(driveKey)
        req.reply(JSON.stringify({}))
      } catch (error) {
        console.error('[worker] failed to follow course:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_CHECK_UPDATE) {
      const { driveKey } = JSON.parse(req.data.toString())

      try {
        req.reply(JSON.stringify(await checkUpdate(driveKey)))
      } catch (error) {
        console.error('[worker] failed to check for an update:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_DOWNLOAD_UPDATE) {
      const { driveKey, targetPath, transferId } = JSON.parse(req.data.toString())

      try {
        req.reply(JSON.stringify(await downloadUpdate(driveKey, targetPath, transferId)))
      } catch (error) {
        if (error.code !== 'CANCELLED') console.error('[worker] failed to download an update:', error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_GET_TRANSFER) {
      const { transferId } = JSON.parse(req.data.toString())
      const transfer = transfers.get(transferId)
      req.reply(JSON.stringify({ transfer: transfer ? transferSnapshot(transfer) : null }))
      return
    }

    // The backup file's public part (who it belongs to, when it was made), to
    // show before asking for the password.
    if (req.command === CMD_READ_IDENTITY_BACKUP) {
      try {
        const { text } = JSON.parse(req.data.toString())
        const backup = readIdentityBackup(text)
        req.reply(JSON.stringify({ createdAt: backup.createdAt, publisherId: backup.publisherId }))
      } catch (error) {
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_FIND_COURSE) {
      const { index, stagingPath, timeoutMs, transferId } = JSON.parse(req.data.toString())

      try {
        const result = await findCourse(index, stagingPath, transferId, timeoutMs)
        req.reply(
          JSON.stringify({
            courseId: result.courseId,
            driveKey: IdEncoding.normalize(result.driveKey),
            publicId: result.publicId,
            publisherId: result.publisherId,
            version: result.version,
            movedTo: result.movedTo,
          }),
        )
      } catch (error) {
        if (error.code !== 'CANCELLED' && error.code !== 'NOT_FOUND') console.error('[worker] failed to find a course:', error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_SHARED_COURSE) {
      let args = {}
      try {
        args = JSON.parse(req.data.toString())
        req.reply(JSON.stringify((await sharedCourseOp(args)) ?? {}))
      } catch (error) {
        if (error.code !== 'LOCKED') console.error(`[worker] shared course "${args.op}" failed:`, error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_FIND_PROGRAM) {
      const { index, stagingPath, timeoutMs, transferId } = JSON.parse(req.data.toString())

      try {
        const result = await findProgram(index, stagingPath, transferId, timeoutMs)
        req.reply(
          JSON.stringify({
            driveKey: IdEncoding.normalize(result.driveKey),
            programId: result.programId,
            publicId: result.publicId,
            publisherId: result.publisherId,
          }),
        )
      } catch (error) {
        if (error.code !== 'CANCELLED' && error.code !== 'NOT_FOUND') console.error('[worker] failed to find a program:', error)
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_GET_PEERS) {
      try {
        req.reply(JSON.stringify({ peers: countPeers(JSON.parse(req.data.toString())) }))
      } catch {
        req.reply(JSON.stringify({ peers: null }))
      }
      return
    }

    if (req.command === CMD_CANCEL_TRANSFER) {
      const { transferId } = JSON.parse(req.data.toString())
      const transfer = transfers.get(transferId)
      if (transfer && !transfer.isCancelled && transfer.phase !== 'done') transfer.cancel()
      req.reply(JSON.stringify({}))
      return
    }

    if (req.command === CMD_STOP_SHARING) {
      const { courseId, driveKey } = JSON.parse(req.data.toString())

      try {
        await stopSharing({ courseId, driveKey })
        req.reply(JSON.stringify({}))
      } catch (error) {
        console.error('[worker] failed to stop sharing:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
    }
  })
}

start().catch((error) => {
  console.error('[worker] failed to start:', error)
})
