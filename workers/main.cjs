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
const { verifySource } = require('./course-source.cjs')
const { createIdentityBackup, openIdentityBackup, readIdentityBackup } = require('./identity-backup.cjs')

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
const CMD_CREATE_IDENTITY_BACKUP = 14 // must match electron/bare-worker.ts
const CMD_READ_IDENTITY_BACKUP = 15 // must match electron/bare-worker.ts
const CMD_RESTORE_IDENTITY = 16 // must match electron/bare-worker.ts
const CMD_RECOVER_COURSE = 17 // must match electron/bare-worker.ts
// Worker → main: an imported course's drive may hold a newer version. Main
// decides what that means (electron/course-sharing.ts).
const EVENT_DRIVE_CHANGED = 100 // must match electron/bare-worker.ts

// How often followed drives are checked for a new version even without an
// 'append' event (e.g. after being offline). Main ignores repeats.
const UPDATE_POLL_INTERVAL_MS = 15 * 60_000
// Reading a remote file waits for a peer that has it; don't wait forever.
const REMOTE_READ_TIMEOUT_MS = 30_000
// A finished transfer's last state stays readable this long, so the UI can show
// its final numbers after the import/update call has returned.
const FINISHED_TRANSFER_TTL_MS = 60_000

// Written into every shared course's drive next to the version's files (never into
// the version itself, so its hashes stay valid): where the course is shared from.
// See "source.json" in docs/contracts.md §5.
const SOURCE_FILE_KEY = '/source.json'

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
const store = new Corestore(storagePath)
// Separate from `store`, not a `.namespace()` of it: a Corestore's `.replicate()`
// serves every namespace sharing its root `cores`/`storage`, and Protomux only keeps
// one slot for "an unknown discovery key showed up" per connection — so one store
// can't safely serve both "anyone who connects" and "only vetted peers." Trust tiers
// are separated by which store a connection gets, not by filtering within one.
const gatedStore = new Corestore(`${storagePath}-gated`)

async function start() {
  // Hyperswarm's peer identity is normally a fresh random keypair every process
  // start. Gating needs it to be stable: the host has to recognize the *same* peer
  // again on a later connection (after `onadd` confirms them), and Hyperswarm reuses
  // one connection per peer across every topic they join together — deriving from
  // the Corestore identity, the same way `createKeyPair('creator')` already does,
  // makes that possible.
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
  const publishedDrives = new Map() // courseId -> { drive, discovery }
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

  async function openPublishedDrive(courseId) {
    const existing = publishedDrives.get(courseId)
    if (existing) {
      return existing
    }

    // Namespaced, not the identity keypair itself: each course gets its own key
    // derived from the same root seed, rather than reusing one Ed25519 key across two
    // independent append-only logs. The namespace is per course, not per version, so
    // the drive key (the code students use) never changes across publishes.
    //
    // The key pair is handed to the drive's db core explicitly (Hyperdrive's `_db`)
    // rather than through the namespace's name: a course brought back from a backup
    // (SLJ-54) was first synced by its key alone, so its stored core has no key pair
    // and opening it by name would be read-only. The blobs core follows the db core's
    // key pair. For a course published here, both ways open the same core.
    const namespace = store.namespace(`course-${courseId}`)
    const keyPair = await namespace.createKeyPair('db')
    const drive = new Hyperdrive(namespace, {
      _db: new Hyperbee(namespace.get({ exclusive: true, keyPair }), DRIVE_DB_OPTIONS),
    })
    await drive.ready()

    // A fresh course has nothing to download, so client discovery is unnecessary here
    // — but keep seeding it for as long as this worker process runs.
    const discovery = swarm.join(drive.discoveryKey, { server: true, client: false })
    const entry = { discovery, drive }
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

  async function writeSourceFile(drive) {
    const creatorKeyPair = await store.createKeyPair('creator')
    const source = Buffer.from(
      JSON.stringify(
        {
          driveKey: IdEncoding.normalize(drive.key),
          publisher: { id: IdEncoding.normalize(creatorKeyPair.publicKey) },
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

  async function publishCourse(courseId, coursePath) {
    const { discovery, drive } = await openPublishedDrive(courseId)

    await mirrorVersionIntoDrive(coursePath, drive)
    await writeSourceFile(drive)
    await discovery.flushed()

    return drive
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
      const changedFiles = await mirrorWithProgress(drive, new Localdrive(targetPath, { atomic: true }), transfer)
      finishTransfer(transferId, transfer, 'done')
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

    const drive = new Hyperdrive(store, driveKey)
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
    const map = courseId ? publishedDrives : followedDrives
    const key = courseId ?? IdEncoding.decode(driveKey).toString('hex')
    const entry = map.get(key)

    if (!entry) {
      return
    }

    map.delete(key)
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
  async function mirrorWithProgress(drive, local, transfer) {
    let total = 0
    const plan = drive.mirror(local, { dryRun: true })
    for await (const diff of plan) {
      if (transfer.isCancelled) throw new TransferCancelled()
      if (diff.op === 'add' || diff.op === 'change') total += await blobSize(drive, diff.key)
    }
    transfer.bytesTotal = total
    transfer.phase = 'downloading'

    const mirror = drive.mirror(local, { progress: true })
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
  async function readCourseTitles(drive, transfer) {
    try {
      const manifest = JSON.parse(await untilCancelled(transfer, drive.get('/course.json')))
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

  async function importCourse(driveKey, coursesRoot, transferId) {
    const transfer = createTransfer(transferId)
    const drive = new Hyperdrive(store, driveKey)
    await drive.ready()
    transfer.drive = drive
    const keyHex = drive.key.toString('hex')
    let stagingPath = null

    // No override: once this finishes, our Corestore holds a real replica, so we keep
    // announcing it (the default, server + client both true) rather than stopping
    // after download — the same "leech becomes a seed" convention that keeps the
    // swarm alive.
    const discovery = swarm.join(drive.discoveryKey)
    // Closing the drive aborts any read still waiting for a peer.
    transfer.onCancel.add(() => drive.close().catch(() => {}))

    try {
      // Nobody with the course online: keep looking (the UI says so) until
      // someone is, or the student cancels.
      await waitForDriveData(drive, transfer)
      transfer.course = await readCourseTitles(drive, transfer)

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

  // ─── Restoring the publisher identity (SLJ-54) ─────────────────────────
  // A new computer gets the identity from its backup file: a fresh store is
  // created next to this one with the restored key (main stops this worker and
  // puts it in place of p2p/), then each course published with it is brought
  // back from the students who have it.

  // A new store at `targetPath` holding the identity from the backup. The key
  // stays in the worker: only the publisher id and the course list go back.
  async function restoreIdentity(text, password, targetPath) {
    const backup = openIdentityBackup(text, password)
    const restored = new Corestore(targetPath, { primaryKey: backup.primaryKey, unsafe: true })

    try {
      await restored.ready()
      const creator = await restored.createKeyPair('creator')
      // The file's public part names the identity; check the key inside is that one.
      if (IdEncoding.normalize(creator.publicKey) !== backup.publisherId) {
        throw Object.assign(new Error('This identity backup is damaged'), { code: 'INVALID_FILE' })
      }
    } finally {
      await restored.close()
      backup.primaryKey.fill(0)
    }

    return { courses: backup.courses, publisherId: backup.publisherId }
  }

  // A course published with this identity on another computer: downloads its
  // published version into `stagingPath` from whoever has it (its students).
  //
  // The drive is opened by its key alone, never through the course's namespace:
  // a core opened with its key pair is "writable", and a writable core never asks
  // peers for a longer history. It would stay empty, and the next publish would
  // start a second history that students' apps refuse. Opened by key, it learns
  // the full history first; publishing (openPublishedDrive) then continues it.
  async function recoverCourse(courseId, stagingPath, transferId) {
    if (publishedDrives.has(courseId)) {
      throw new Error('This course is already shared from this device')
    }

    const transfer = createTransfer(transferId)
    const { publicKey } = await store.namespace(`course-${courseId}`).createKeyPair('db')
    // Only the public key: the core is created without a key pair (read-only).
    const probe = store.get({ manifest: { signers: [{ publicKey }], version: store.manifestVersion } })
    await probe.ready()
    const driveKey = probe.key
    await probe.close()

    const drive = new Hyperdrive(store.session(), driveKey)
    await drive.ready()
    transfer.drive = drive
    // Until the first lookup is done, update() waits for peers instead of
    // answering from the (empty) local copy.
    const doneFindingPeers = drive.findingPeers()
    swarm.join(drive.discoveryKey)
    swarm.flush().then(doneFindingPeers, doneFindingPeers)
    transfer.onCancel.add(() => drive.close().catch(() => {}))

    try {
      await waitForDriveData(drive, transfer)
      // The newest version any connected peer has.
      await untilCancelled(transfer, drive.update({ wait: true }))
      transfer.course = await readCourseTitles(drive, transfer)
      await mirrorWithProgress(drive, new Localdrive(stagingPath), transfer)

      const manifest = JSON.parse(await fsp.readFile(path.join(stagingPath, 'course.json'), 'utf8'))
      if (manifest.id !== courseId) {
        throw new Error('The drive holds a different course')
      }
      const publisherId = await readVerifiedSource(stagingPath, drive.key)

      finishTransfer(transferId, transfer, 'done')
      return { driveKey: drive.key, publisherId, version: manifest.version }
    } catch (error) {
      finishTransfer(transferId, transfer, transfer.isCancelled ? 'cancelled' : 'error')
      throw transfer.isCancelled ? new TransferCancelled() : error
    } finally {
      // Sharing it again is publishing's job, through the course's own namespace.
      await swarm.leave(drive.discoveryKey).catch(() => {})
      await drive.close().catch(() => {})
    }
  }

  rpc = new RPC(new Pipe(3), async (req) => {
    if (req.command === CMD_GET_CREATOR_KEY) {
      try {
        const keyPair = await store.createKeyPair('creator')
        req.reply(IdEncoding.normalize(keyPair.publicKey))
      } catch (error) {
        console.error('[worker] failed to derive creator key:', error)
        req.reply(`error: ${error.message}`)
      }
      return
    }

    if (req.command === CMD_PUBLISH_COURSE) {
      const { courseId, coursePath } = JSON.parse(req.data.toString())

      try {
        const drive = await publishCourse(courseId, coursePath)
        req.reply(JSON.stringify({ driveKey: IdEncoding.normalize(drive.key) }))
      } catch (error) {
        console.error('[worker] failed to publish course:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
      return
    }

    if (req.command === CMD_IMPORT_COURSE) {
      const { driveKey, coursesRoot, transferId } = JSON.parse(req.data.toString())

      try {
        const result = await importCourse(driveKey, coursesRoot, transferId)
        req.reply(
          JSON.stringify({
            courseId: result.courseId,
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

    // The publisher identity backup (SLJ-53): the store's primary key and the
    // published courses, encrypted with the teacher's password. Only the
    // encrypted file leaves the worker; main writes it where the teacher chose.
    if (req.command === CMD_CREATE_IDENTITY_BACKUP) {
      try {
        const { courses, password } = JSON.parse(req.data.toString())
        await store.ready()
        const creator = await store.createKeyPair('creator')
        const backup = createIdentityBackup({
          courses,
          password,
          primaryKey: store.primaryKey,
          publisherId: IdEncoding.normalize(creator.publicKey),
        })
        req.reply(JSON.stringify({ backup }))
      } catch (error) {
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
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

    if (req.command === CMD_RESTORE_IDENTITY) {
      try {
        const { password, targetPath, text } = JSON.parse(req.data.toString())
        req.reply(JSON.stringify(await restoreIdentity(text, password, targetPath)))
      } catch (error) {
        req.reply(JSON.stringify({ code: error.code, error: error.message }))
      }
      return
    }

    if (req.command === CMD_RECOVER_COURSE) {
      const { courseId, stagingPath, transferId } = JSON.parse(req.data.toString())

      try {
        if (!isValidCourseId(courseId)) throw new Error('Invalid course id')
        const result = await recoverCourse(courseId, stagingPath, transferId)
        req.reply(
          JSON.stringify({
            driveKey: IdEncoding.normalize(result.driveKey),
            publisherId: result.publisherId,
            version: result.version,
          }),
        )
      } catch (error) {
        if (error.code !== 'CANCELLED') console.error('[worker] failed to recover a course:', error)
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
