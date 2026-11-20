// The seeder itself (SLJ-144): starts the app's own Bare worker, without
// Electron, through the shared client (workers/worker-client.mjs), and keeps
// every code on `<data>/kept.json` online: a full copy of each one's current
// version, fetched again whenever a new version is published
// (CMD.KEEP_DRIVE, workers/drive-keeping.cjs).
//
// A kept channel or program also keeps everything it lists, including what's
// added to it later (SLJ-194, wanted.mjs).
//
// Every few seconds it lines the worker up with the list (so `add` and
// `remove` reach a running seeder), and writes `<data>/status.json` for
// `status`. It logs what changes: a code kept or dropped, a new version kept,
// an error. It never holds a publishing identity: it only serves.
//
// A new code starts only while there's space (space.mjs): under the store's
// cap, if one is set, and with enough of the disk left free. Otherwise it
// waits, and starts once something is removed or the disk has room again.
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
import { DEFAULT_MIN_FREE, diskOf, folderSize, spaceState } from './space.mjs'
import { wantedCodes } from './wanted.mjs'
import { startWebServer } from './web.mjs'

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

// How many log lines the web page shows.
const RECENT_LINES = 50
// How often the store's size is measured: walking it costs more than a sync.
const MEASURE_MS = 60_000

// Runs until `stop()` (or SIGINT/SIGTERM, with `handleSignals`). `bootstrap`:
// a test-only local DHT ("host:port,…"), the public network otherwise.
// `web`: { port, host, open, setupOpen } to serve the page (web.mjs), or null.
// `maxStore` / `minFree`: the space limits in bytes (space.mjs).
export async function runSeeder({
  bootstrap = process.env.MATKO_DHT_BOOTSTRAP ?? '',
  dataDir,
  handleSignals = false,
  log: print = (line) => console.log(`[${new Date().toISOString()}] ${line}`),
  maxStore = null,
  minFree = DEFAULT_MIN_FREE,
  pollMs = 3_000,
  web = null,
} = {}) {
  fs.mkdirSync(dataDir, { recursive: true })
  const recent = []
  const log = (line) => {
    recent.push({ at: new Date().toISOString(), line })
    if (recent.length > RECENT_LINES) recent.shift()
    print(line)
  }
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
  // The worker's last report: what kept channels and programs list.
  let lastKept = []
  // The same, with each entry's `via`, for status.json and the page.
  let keptNow = []
  let webServer = null
  let timer = null
  // The store's size, measured now and then (MEASURE_MS), and what the
  // limits say about it; codes waiting for space.
  let storeBytes = 0
  let measuredAt = 0
  let space = spaceState({ disk: diskOf(dataDir), maxStore, minFree, storeBytes })
  // What the log last said about it, so a full disk is said once, also at
  // the start.
  let loggedFull = null
  const waiting = new Set()

  function checkSpace() {
    if (Date.now() - measuredAt >= MEASURE_MS) {
      storeBytes = folderSize(path.join(dataDir, 'store'))
      measuredAt = Date.now()
    }
    space = spaceState({ disk: diskOf(dataDir), maxStore, minFree, storeBytes })
    if (space.full === loggedFull) return
    if (space.full) {
      log(space.full === 'cap' ? 'the store reached its size limit: new codes wait' : 'the disk is nearly full: new codes wait')
    } else {
      log('there is space again: waiting codes start')
    }
    loggedFull = space.full
  }

  async function sync() {
    let wanted
    try {
      wanted = wantedCodes(
        readKeptList(dataDir).map((entry) => entry.code),
        lastKept,
      )
    } catch (error) {
      log(`can't read ${path.join(dataDir, 'kept.json')}: ${error.message}; keeping what's kept`)
      wanted = new Map([...active.keys()].map((code) => [code, { via: null }]))
    }
    checkSpace()
    for (const [code, { via }] of wanted) {
      if (active.has(code)) continue
      if (space.full) {
        if (!waiting.has(code)) log(`${short(code)} waits for space`)
        waiting.add(code)
        continue
      }
      waiting.delete(code)
      try {
        await worker.request(CMD.KEEP_DRIVE, { driveKey: code })
        active.set(code, '')
        // Measured again soon: a new code may be big.
        measuredAt = 0
        log(via ? `keeping ${short(code)}, listed by ${short(via)}` : `keeping ${short(code)}`)
      } catch (error) {
        log(`can't keep ${short(code)}: ${error.message}`)
      }
    }
    for (const code of [...waiting]) if (!wanted.has(code)) waiting.delete(code)
    for (const code of [...active.keys()]) {
      if (wanted.has(code)) continue
      try {
        await worker.request(CMD.STOP_SHARING, { driveKey: code })
        active.delete(code)
        measuredAt = 0
        log(`stopped keeping ${short(code)}`)
      } catch (error) {
        log(`can't stop keeping ${short(code)}: ${error.message}`)
      }
    }

    const { kept: reported } = await worker.request(CMD.LIST_KEPT_DRIVES, {})
    lastKept = reported
    // `via`: the program or channel a code is kept for; null when it's on the list.
    const kept = reported.map((entry) => ({ ...entry, via: wanted.get(entry.driveKey)?.via ?? null }))
    keptNow = kept
    for (const entry of kept) {
      const seen = `${entry.state} ${entry.version ?? ''} ${entry.error ?? ''}`
      if (active.get(entry.driveKey) === seen) continue
      active.set(entry.driveKey, seen)
      const name = entry.title ? `"${entry.title}"` : short(entry.driveKey)
      if (entry.state === 'kept') log(`kept ${entry.kind ?? 'drive'} ${name} ${entry.version ?? ''} (${entry.kept?.files ?? 0} files)`)
      else if (entry.state === 'error') log(`${name}: ${entry.error} (trying again in a minute)`)
      else log(`fetching ${name}`)
    }
    writeJson(path.join(dataDir, STATUS_FILE), {
      kept,
      pid: process.pid,
      running: true,
      space,
      updatedAt: new Date().toISOString(),
      waiting: [...waiting],
    })
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
    await webServer?.close().catch(() => {})
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

  if (web) {
    try {
      webServer = await startWebServer({
        ...web,
        dataDir,
        state: () => ({ kept: keptNow, recent, running: !stopping, space, waiting: [...waiting] }),
      })
      log(`web page on http://${web.host?.includes(':') ? `[${web.host}]` : (web.host ?? '127.0.0.1')}:${webServer.port}/${web.open ? ' (open: something in front of it checks who it is)' : ''}`)
    } catch (error) {
      await stop(1)
      throw new Error(`The web page didn't start: ${error.message}`)
    }
  }

  return { done, stop, webPort: webServer?.port ?? null }
}
