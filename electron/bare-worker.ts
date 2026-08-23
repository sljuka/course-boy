// Phase 1 of the planned peer-to-peer work (see docs/pear-integration-notes.md):
// generates and persists a Corestore-backed keypair inside the Bare worker — the
// user's "creator key." Still no networking, no renderer/IPC surface: identity is
// created lazily the first time someone presses "Share" (Phase 6), so this phase only
// builds and verifies the mechanism, the same low-level way Phase 0 did.
//
// Supersedes Phase 0's raw ping/pong: a real request (`getCreatorKey`) needs a real
// request/response protocol, so the pipe now carries `bare-rpc` instead of
// `framed-stream` — bare-rpc does its own framing and must sit directly on the raw
// duplex, not stacked under another framing layer.
import path from 'node:path'
import spawnBare from 'bare-runtime/spawn'
import RPC from 'bare-rpc'
import { app } from 'electron'

// Must match workers/main.cjs.
const CMD_GET_CREATOR_KEY = 1

declare global {
  // eslint-disable-next-line no-var
  var __creatorPublicKeyPhase1: string
}

let rpc: RPC | null = null

export async function getCreatorKey(): Promise<string> {
  if (!rpc) {
    throw new Error('Bare worker is not running')
  }

  const request = rpc.request(CMD_GET_CREATOR_KEY)
  request.send()

  const reply = await request.reply('utf-8')
  return reply ? reply.toString() : ''
}

export function spawnBareWorker(): void {
  globalThis.__creatorPublicKeyPhase1 = 'spawning'

  try {
    const workerPath = path.join(process.env.APP_ROOT, 'workers/main.cjs')
    const storagePath = path.join(app.getPath('userData'), 'identity')

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
      // The worker never sends main a request in Phase 1.
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
