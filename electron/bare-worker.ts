// Phase 0 of the planned peer-to-peer work (see docs/pear-integration-notes.md):
// validates that Electron's main process and a Bare child process can exchange bytes
// at all, before any real feature (identity, publish/import, discovery) is built on
// top of it. Deliberately skips `pear-runtime` — see the doc for why — and spawns the
// Bare runtime directly instead.
//
// `globalThis.__bareWorkerPhase0Status` is the verification hook: no renderer/IPC
// surface exists yet, so this is what `run-desktop`'s `main <expr>` command (and,
// later, an e2e assertion) reads to confirm the exchange completed.
import path from 'node:path'
import type { Socket } from 'node:net'
import spawnBare from 'bare-runtime/spawn'
import FramedStream from 'framed-stream'
import { app } from 'electron'

declare global {
  // eslint-disable-next-line no-var
  var __bareWorkerPhase0Status: string
}

export function spawnBareWorker(): void {
  globalThis.__bareWorkerPhase0Status = 'spawning'

  try {
    const workerPath = path.join(process.env.APP_ROOT, 'workers/ping-pong.cjs')

    const worker = spawnBare('bare', {
      args: [workerPath],
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    })

    worker.on('error', (error) => {
      globalThis.__bareWorkerPhase0Status = `error: ${error.message}`
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
    // (beyond stdin/stdout/stderr) is actually a full-duplex Socket at runtime.
    const controlPipe = worker.stdio[3] as Socket
    const stream = new FramedStream(controlPipe)

    stream.on('error', (error: Error) => {
      globalThis.__bareWorkerPhase0Status = `stream error: ${error.message}`
      console.error('[bare-worker] stream error:', error)
    })

    stream.on('data', (message: Buffer) => {
      console.log('[bare-worker] received:', message.toString())
      globalThis.__bareWorkerPhase0Status = 'pong-received'
    })

    stream.write('ping')

    app.on('will-quit', () => {
      worker.kill()
    })
  } catch (error) {
    globalThis.__bareWorkerPhase0Status = `sync error: ${(error as Error).message}`
    console.error('[bare-worker] synchronous failure:', error)
  }
}
