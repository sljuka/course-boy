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

const CMD_GET_CREATOR_KEY = 1 // must match electron/bare-worker.ts
const CMD_PUBLISH_COURSE = 2 // must match electron/bare-worker.ts
const CMD_IMPORT_COURSE = 3 // must match electron/bare-worker.ts

const storagePath = Bare.argv[2]
const store = new Corestore(storagePath)

const swarm = new Hyperswarm()
swarm.on('connection', (conn) => store.replicate(conn))

async function publishCourse(courseId, coursePath) {
  // Namespaced, not the identity keypair itself: each course gets its own key derived
  // from the same root seed, rather than reusing one Ed25519 key across two
  // independent append-only logs.
  const drive = new Hyperdrive(store.namespace(`course-${courseId}`))
  await drive.ready()

  const mirror = new Localdrive(coursePath).mirror(drive)
  await mirror.done()

  // A fresh course has nothing to download, so client discovery is unnecessary here —
  // but keep seeding it for as long as this worker process runs.
  const discovery = swarm.join(drive.discoveryKey, { server: true, client: false })
  await discovery.flushed()

  return IdEncoding.normalize(drive.key)
}

async function importCourse(driveKey, destPath) {
  const drive = new Hyperdrive(store, driveKey)
  await drive.ready()

  // No override: once this finishes, our Corestore holds a real replica, so we keep
  // announcing it (the default, server + client both true) rather than stopping after
  // download — the same "leech becomes a seed" convention that keeps the swarm alive.
  const discovery = swarm.join(drive.discoveryKey)
  await discovery.flushed()
  await swarm.flush()

  await drive.mirror(new Localdrive(destPath)).done()
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
      const driveKey = await publishCourse(courseId, coursePath)
      req.reply(JSON.stringify({ driveKey }))
    } catch (error) {
      console.error('[worker] failed to publish course:', error)
      req.reply(JSON.stringify({ error: error.message }))
    }
    return
  }

  if (req.command === CMD_IMPORT_COURSE) {
    const { driveKey, destPath } = JSON.parse(req.data.toString())

    try {
      await importCourse(driveKey, destPath)
      req.reply(JSON.stringify({ ok: true }))
    } catch (error) {
      console.error('[worker] failed to import course:', error)
      req.reply(JSON.stringify({ error: error.message }))
    }
  }
})
