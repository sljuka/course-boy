// The host's side of the Bare worker (workers/main.cjs): starts it and talks to
// it. Runs in Node, never in Bare: in the app's main process
// (electron/bare-worker.ts) and in the headless seeder (SLJ-144), so both
// start and drive the same worker the same way.
//
// The pipe carries `bare-rpc`, which does its own framing and must sit directly
// on the raw duplex (the worker's fourth stdio slot), not under another layer.
// The command and event numbers are in workers/protocol.json; this file knows
// none of them, so a host imports that itself.
import spawnBare from 'bare-runtime/spawn'
import RPC from 'bare-rpc'

// Starts the worker. `args` follow the worker's path (its storage folder, and
// the optional test-only DHT bootstrap and download limits). Events the worker
// sends (EVENT_* in protocol.json) go to `onEvent` and are answered at once.
export function startWorker({ args = [], onError, onEvent, onExit, onStderr, onStdout, workerPath }) {
  const worker = spawnBare('bare', {
    args: [workerPath, ...args],
    stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
  })
  let rpc = null
  let running = true

  worker.on('error', (error) => onError?.(error))
  worker.on('exit', (code, signal) => {
    running = false
    onExit?.(code, signal)
  })
  worker.stdout?.on('data', (chunk) => onStdout?.(chunk.toString()))
  worker.stderr?.on('data', (chunk) => onStderr?.(chunk.toString()))

  rpc = new RPC(worker.stdio[3], (req) => {
    try {
      onEvent?.(req.command, req.data ? req.data.toString() : '')
    } finally {
      req.reply('')
    }
  })

  function requireRpc() {
    if (!rpc || !running) throw new Error('Bare worker is not running')
    return rpc
  }

  // Sends a command and resolves to the worker's raw reply, as text.
  async function requestRaw(command, payload) {
    const request = requireRpc().request(command)
    request.send(payload === undefined ? undefined : JSON.stringify(payload))
    const reply = await request.reply('utf-8')
    return reply ? reply.toString() : ''
  }

  // Sends a command and resolves to its JSON reply. A reply with `error`
  // throws, keeping its `code` (e.g. CANCELLED, LOCKED, WRONG_PASSWORD).
  // `fromWorker`: the worker answered with it, unlike a worker that stopped and
  // never answered.
  async function request(command, payload) {
    const result = JSON.parse((await requestRaw(command, payload)) || '{}')
    if (result.error) {
      throw Object.assign(new Error(result.error), { code: result.code, fromWorker: true })
    }
    return result
  }

  // Stops the worker; resolves once it has exited (killed after `timeoutMs`).
  // Requests still waiting fail.
  async function stop({ timeoutMs = 5_000 } = {}) {
    rpc = null
    if (worker.exitCode !== null || worker.signalCode !== null) return
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        worker.kill('SIGKILL')
        resolve()
      }, timeoutMs)
      worker.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
      worker.kill()
    })
  }

  return {
    // Kills it without waiting (a host that is quitting).
    kill: () => worker.kill(),
    request,
    requestRaw,
    stop,
  }
}
