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
    // here waits on it.
    const discovery = swarm.join(drive.discoveryKey)
    followedDrives.set(keyHex, { discovery, drive })
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

  const rpc = new RPC(new Pipe(3), async (req) => {
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
