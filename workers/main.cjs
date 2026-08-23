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

const CMD_GET_CREATOR_KEY = 1 // must match electron/bare-worker.ts
const CMD_PUBLISH_COURSE = 2 // must match electron/bare-worker.ts

const storagePath = Bare.argv[2]
const store = new Corestore(storagePath)

async function publishCourse(courseId, coursePath) {
  // Namespaced, not the identity keypair itself: each course gets its own key derived
  // from the same root seed, rather than reusing one Ed25519 key across two
  // independent append-only logs.
  const drive = new Hyperdrive(store.namespace(`course-${courseId}`))
  await drive.ready()

  const mirror = new Localdrive(coursePath).mirror(drive)
  await mirror.done()

  return IdEncoding.normalize(drive.key)
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
  }
})
