// Peer-to-peer work (see docs/pear-integration-notes.md), phases 1–3:
// Phase 1 generates and persists a Corestore-backed identity keypair inside the Bare
// worker — the user's "creator key." Phase 2 adds mirroring a course's package
// directory into a Hyperdrive under that same Corestore (namespaced per course, so
// each course gets its own key derived from the same root seed rather than reusing the
// identity key as a Hypercore signing key). Phase 3 adds real Hyperswarm discovery, so
// an import can finally find a peer to replicate from — the thing Phase 2 built and
// proved correct but left unwired, since there was nothing to connect it to yet.
// Identity/publish/import are all real capabilities with no UI in front of them yet
// (that's Phase 6's "Share"/"Import" triggers), so these phases only build and verify
// the mechanism, the same low-level way Phase 0 did.
//
// Phase 0's raw ping/pong was superseded in Phase 1: a real request needs a real
// request/response protocol, so the pipe carries `bare-rpc` — bare-rpc does its own
// framing and must sit directly on the raw duplex, not stacked under another framing
// layer.
import path from 'node:path'
import spawnBare from 'bare-runtime/spawn'
import RPC from 'bare-rpc'
import { app } from 'electron'

// Must match workers/main.cjs.
const CMD_GET_CREATOR_KEY = 1
const CMD_PUBLISH_COURSE = 2
const CMD_IMPORT_COURSE = 3

declare global {
  // eslint-disable-next-line no-var
  var __creatorPublicKeyPhase1: string
  // eslint-disable-next-line no-var
  var __matkoBareWorker: {
    getCreatorKey: typeof getCreatorKey
    publishCourse: typeof publishCourse
    importCourse: typeof importCourse
  }
}

let rpc: RPC | null = null

function requireRpc(): RPC {
  if (!rpc) {
    throw new Error('Bare worker is not running')
  }

  return rpc
}

export async function getCreatorKey(): Promise<string> {
  const request = requireRpc().request(CMD_GET_CREATOR_KEY)
  request.send()

  const reply = await request.reply('utf-8')
  return reply ? reply.toString() : ''
}

export async function publishCourse(courseId: string): Promise<string> {
  const coursePath = path.join(app.getPath('userData'), 'courses', courseId, 'draft')

  const request = requireRpc().request(CMD_PUBLISH_COURSE)
  request.send(JSON.stringify({ courseId, coursePath }))

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as {
    driveKey?: string
    error?: string
  }

  if (result.error) {
    throw new Error(result.error)
  }

  return result.driveKey ?? ''
}

export async function importCourse(driveKey: string, courseId: string): Promise<void> {
  const destPath = path.join(app.getPath('userData'), 'courses', courseId, 'draft')

  const request = requireRpc().request(CMD_IMPORT_COURSE)
  request.send(JSON.stringify({ destPath, driveKey }))

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as { error?: string }

  if (result.error) {
    throw new Error(result.error)
  }
}

// No renderer/IPC surface yet (Phase 6's "Share"/"Import" triggers) — this is the
// verification hook the `run-desktop` driver's `main <expr>` command calls directly,
// same idea as Phase 0/1's `globalThis.__*Phase*Status` values.
globalThis.__matkoBareWorker = { getCreatorKey, importCourse, publishCourse }

export function spawnBareWorker(): void {
  globalThis.__creatorPublicKeyPhase1 = 'spawning'

  try {
    const workerPath = path.join(process.env.APP_ROOT, 'workers/main.cjs')
    const storagePath = path.join(app.getPath('userData'), 'p2p')

    const worker = spawnBare('bare', {
      args: [workerPath, storagePath],
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    })

    worker.on('error', (error) => {
      globalThis.__creatorPublicKeyPhase1 = `error: ${error.message}`
      console.error('[bare-worker] failed to spawn:', error)
    })

    worker.on('exit', (code, signal) => {
      console.log('[bare-worker] worker exited', { code, signal })
    })

    worker.stdout?.on('data', (chunk: Buffer) => {
      console.log('[bare-worker] worker stdout:', chunk.toString())
    })

    worker.stderr?.on('data', (chunk: Buffer) => {
      console.error('[bare-worker] worker stderr:', chunk.toString())
    })

    // Node's own child_process types don't capture that an extra 'pipe' stdio slot
    // (beyond stdin/stdout/stderr) is actually a full-duplex Socket at runtime — and
    // bare-rpc's own Duplex type (from `bare-stream`) declares Bare-internal members a
    // Node Socket doesn't structurally have, even though it satisfies bare-rpc's actual
    // (duck-typed) runtime usage. Double-cast through `unknown` for that boundary.
    const controlPipe = worker.stdio[3] as unknown as ConstructorParameters<typeof RPC>[0]
    rpc = new RPC(controlPipe, () => {
      // The worker never sends main a request in Phases 1-3.
    })

    getCreatorKey()
      .then((key) => {
        globalThis.__creatorPublicKeyPhase1 = key
        console.log('[bare-worker] creator key:', key)
      })
      .catch((error: Error) => {
        globalThis.__creatorPublicKeyPhase1 = `error: ${error.message}`
        console.error('[bare-worker] failed to get creator key:', error)
      })

    app.on('will-quit', () => {
      worker.kill()
    })
  } catch (error) {
    globalThis.__creatorPublicKeyPhase1 = `sync error: ${(error as Error).message}`
    console.error('[bare-worker] synchronous failure:', error)
  }
}
