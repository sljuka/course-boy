// The seeder itself (SLJ-144): starts the app's own Bare worker, without
// Electron, through the shared client (workers/worker-client.mjs), and keeps
// every code on `<data>/kept.json` online: a full copy of each one's current
// version, fetched again whenever a new version is published
// (CMD.KEEP_DRIVE, workers/drive-keeping.cjs).
//
// Every few seconds it lines the worker up with the list (so `add` and
// `remove` reach a running seeder), and writes `<data>/status.json` for
// `status`. It logs what changes: a code kept or dropped, a new version kept,
// an error. It never holds a publishing identity: it only serves.
//
// <data>/
//   store/        the worker's Corestore (the courses' blocks)
//   kept.json     the codes to keep (kept-list.mjs)
//   status.json   what the running seeder keeps now
//   seeder.pid    the running seeder, so two never share one store
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import protocol from '../workers/protocol.json' with { type: 'json' }
import { startWorker } from '../workers/worker-client.mjs'
import { readKeptList } from './kept-list.mjs'

const CMD = protocol.commands
const WORKER_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../workers/main.cjs')
export const STATUS_FILE = 'status.json'
export const PID_FILE = 'seeder.pid'

export const short = (code) => `${code.slice(0, 8)}…`

export function isRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

function writeJson(file, value) {
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n')
  fs.renameSync(temp, file)
}

// One seeder per data folder: the worker's store can't be shared.
function claim(dataDir) {
  const file = path.join(dataDir, PID_FILE)
  const other = Number.parseInt(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', 10)
  if (other !== process.pid && isRunning(other)) {
    throw new Error(`A seeder is already running on ${dataDir} (pid ${other}).`)
  }
  fs.writeFileSync(file, `${process.pid}\n`)
  return () => {
    try {
      if (Number.parseInt(fs.readFileSync(file, 'utf8'), 10) === process.pid) fs.rmSync(file)
    } catch {
      // gone already
    }
  }
}

// Runs until `stop()` (or SIGINT/SIGTERM, with `handleSignals`). `bootstrap`:
// a test-only local DHT ("host:port,…"), the public network otherwise.
export async function runSeeder({
  bootstrap = process.env.MATKO_DHT_BOOTSTRAP ?? '',
  dataDir,
  handleSignals = false,
  log = (line) => console.log(`[${new Date().toISOString()}] ${line}`),
  pollMs = 3_000,
} = {}) {
  fs.mkdirSync(dataDir, { recursive: true })
  const release = claim(dataDir)
  let stopping = false
  let resolveDone
  const done = new Promise((resolve) => (resolveDone = resolve))

  const worker = startWorker({
    args: bootstrap ? [path.join(dataDir, 'store'), bootstrap] : [path.join(dataDir, 'store')],
    onError: (error) => log(`worker failed to start: ${error.message}`),
    onExit: (code, signal) => {
      if (stopping) return
      log(`worker stopped unexpectedly (${signal ?? `exit ${code}`}); stopping`)
      void stop(1)
    },
    onStderr: (text) => {
      for (const line of text.split('\n').filter(Boolean)) log(`worker: ${line}`)
    },
    workerPath: WORKER_PATH,
  })

  // code -> what was last logged about it ("state version"), to log changes only.
  const active = new Map()
  let timer = null

  async function sync() {
    let wanted
    try {
      wanted = new Set(readKeptList(dataDir).map((entry) => entry.code))
    } catch (error) {
      log(`can't read ${path.join(dataDir, 'kept.json')}: ${error.message}; keeping what's kept`)
      wanted = new Set(active.keys())
    }
    for (const code of wanted) {
      if (active.has(code)) continue
      try {
        await worker.request(CMD.KEEP_DRIVE, { driveKey: code })
        active.set(code, '')
        log(`keeping ${short(code)}`)
      } catch (error) {
        log(`can't keep ${short(code)}: ${error.message}`)
      }
    }
    for (const code of [...active.keys()]) {
      if (wanted.has(code)) continue
      try {
        await worker.request(CMD.STOP_SHARING, { driveKey: code })
        active.delete(code)
        log(`stopped keeping ${short(code)}`)
      } catch (error) {
        log(`can't stop keeping ${short(code)}: ${error.message}`)
      }
    }

    const { kept } = await worker.request(CMD.LIST_KEPT_DRIVES, {})
    for (const entry of kept) {
      const seen = `${entry.state} ${entry.version ?? ''} ${entry.error ?? ''}`
      if (active.get(entry.driveKey) === seen) continue
      active.set(entry.driveKey, seen)
      const name = entry.title ? `"${entry.title}"` : short(entry.driveKey)
      if (entry.state === 'kept') log(`kept ${entry.kind ?? 'drive'} ${name} ${entry.version ?? ''} (${entry.kept?.files ?? 0} files)`)
      else if (entry.state === 'error') log(`${name}: ${entry.error} (trying again in a minute)`)
      else log(`fetching ${name}`)
    }
    writeJson(path.join(dataDir, STATUS_FILE), { kept, pid: process.pid, running: true, updatedAt: new Date().toISOString() })
  }

  async function loop() {
    if (stopping) return
    try {
      await sync()
    } catch (error) {
      if (!stopping) log(`sync failed: ${error.message}`)
    }
    if (!stopping) timer = setTimeout(loop, pollMs)
  }

  async function stop(exitCode = 0) {
    if (stopping) return done
    stopping = true
    clearTimeout(timer)
    await worker.stop().catch(() => {})
    try {
      const file = path.join(dataDir, STATUS_FILE)
      const last = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { kept: [] }
      writeJson(file, { ...last, running: false, updatedAt: new Date().toISOString() })
    } catch {
      // nothing to record
    }
    release()
    log('stopped')
    resolveDone(exitCode)
    return done
  }

  if (handleSignals) {
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void stop(0))
  }

  try {
    await worker.requestRaw(CMD.GET_CREATOR_KEY)
  } catch (error) {
    await stop(1)
    throw new Error(`The worker didn't start: ${error.message}`)
  }
  log(`seeder running on ${dataDir} (${bootstrap ? 'local test network' : 'public network'})`)
  await loop()

  return { done, stop }
}
