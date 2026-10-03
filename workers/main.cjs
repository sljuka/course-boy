// The real, ongoing Bare worker body (see docs/pear-integration-notes.md) — supersedes
// Phase 0's disposable workers/ping-pong.cjs spike. Talks to electron/bare-worker.ts
// over bare-rpc on the fd-3 pipe (Bare.argv[0] is the Bare binary itself, [1] this
// script's own path — spawn arguments start at [2]).
const Pipe = require('bare-pipe')
const RPC = require('bare-rpc')
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const Localdrive = require('localdrive')
const IdEncoding = require('hypercore-id-encoding')
const Hyperswarm = require('hyperswarm')
const BlindPairing = require('blind-pairing')
const fsp = require('bare-fs/promises')
const path = require('bare-path')
const { isValidCourseId } = require('./course-id.cjs')
const { verifySource } = require('./course-source.cjs')

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
// Worker → main: an imported course's drive may hold a newer version. Main
// decides what that means (electron/course-sharing.ts).
const EVENT_DRIVE_CHANGED = 100 // must match electron/bare-worker.ts

// How often followed drives are checked for a new version even without an
// 'append' event (e.g. after being offline). Main ignores repeats.
const UPDATE_POLL_INTERVAL_MS = 15 * 60_000
// Reading a remote file waits for a peer that has it; don't wait forever.
const REMOTE_READ_TIMEOUT_MS = 30_000

// Written into every shared course's drive next to the version's files (never into
// the version itself, so its hashes stay valid): where the course is shared from.
// See "source.json" in docs/contracts.md §5.
const SOURCE_FILE_KEY = '/source.json'

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
    const drive = new Hyperdrive(store.namespace(`course-${courseId}`))
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
  async function downloadUpdate(driveKey, targetPath) {
    const drive = getFollowedDrive(driveKey)
    await drive.update()

    const mirror = drive.mirror(new Localdrive(targetPath, { atomic: true }))
    const changedFiles = []

    for await (const diff of mirror) {
      changedFiles.push({ key: diff.key, op: diff.op })
    }

    return { changedFiles }
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

  async function importCourse(driveKey, coursesRoot) {
    const drive = new Hyperdrive(store, driveKey)
    await drive.ready()
    const keyHex = drive.key.toString('hex')

    // No override: once this finishes, our Corestore holds a real replica, so we keep
    // announcing it (the default, server + client both true) rather than stopping
    // after download — the same "leech becomes a seed" convention that keeps the
    // swarm alive.
    const discovery = swarm.join(drive.discoveryKey)

    try {
      await discovery.flushed()
      await swarm.flush()

      const stagingPath = stagingPathFor(coursesRoot)
      await drive.mirror(new Localdrive(stagingPath)).done()

      const { courseId, publisherId } = await finalizeImportedCourse(stagingPath, coursesRoot, drive.key)
      followedDrives.set(keyHex, { discovery, drive })
      watchFollowedDrive(drive)
      return { courseId, driveKey: drive.key, publisherId }
    } catch (error) {
      // Don't keep seeding a course that didn't land.
      if (!followedDrives.has(keyHex)) {
        await swarm.leave(drive.discoveryKey).catch(() => {})
        await drive.close().catch(() => {})
      }
      throw error
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
      const { driveKey, coursesRoot } = JSON.parse(req.data.toString())

      try {
        const result = await importCourse(driveKey, coursesRoot)
        req.reply(
          JSON.stringify({
            courseId: result.courseId,
            driveKey: IdEncoding.normalize(result.driveKey),
            publisherId: result.publisherId,
          }),
        )
      } catch (error) {
        console.error('[worker] failed to import course:', error)
        req.reply(JSON.stringify({ error: error.message }))
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
      const { driveKey, targetPath } = JSON.parse(req.data.toString())

      try {
        req.reply(JSON.stringify(await downloadUpdate(driveKey, targetPath)))
      } catch (error) {
        console.error('[worker] failed to download an update:', error)
        req.reply(JSON.stringify({ error: error.message }))
      }
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
