#!/usr/bin/env node
// The headless seeder's command line (SLJ-144): keeps Matko courses, programs
// and channels online on a computer without a display (a home server, a
// Raspberry Pi, a small VPS), so students can import and update them while
// the teacher's computer is off. See seeder/README.md.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { addCode, codeFromInput, readKeptList, removeCode } from './kept-list.mjs'
import { STATUS_FILE, isRunning, runSeeder, short } from './run.mjs'
import { DEFAULT_MIN_FREE, parseSize } from './space.mjs'

const USAGE = `Usage: node seeder/cli.mjs <command> [--data <dir>]

  run              Keep every code on the list online (runs until stopped)
  add <code|link>  Add a course, program or channel by its code or matko:// link
  remove <code>    Stop keeping it
  list             The codes on the list
  status           What the running seeder keeps now

--data <dir>  Where the seeder keeps everything (default: $MATKO_SEED_DATA,
              or ~/.matko-seed). One running seeder per folder.
--web <port>  With run: also serve a web page to add, list and remove
              (default: $MATKO_SEED_WEB_PORT; none if unset). It listens on
              $MATKO_SEED_WEB_HOST (default 127.0.0.1); anywhere else it needs
              $MATKO_SEED_WEB_PASSWORD, or MATKO_SEED_WEB_OPEN=1 behind a
              proxy that already checks who it is (Umbrel).

Space (with run): a new code waits while the store is over
$MATKO_SEED_MAX_SIZE (e.g. 40GB; no limit if unset) or the disk has less
than $MATKO_SEED_MIN_FREE free (default 1GB). What's kept stays online.`

// A status this old is from a seeder that isn't running any more.
const STALE_MS = 30_000

function parse(argv) {
  const args = [...argv]
  let dataDir = process.env.MATKO_SEED_DATA || path.join(os.homedir(), '.matko-seed')
  const index = args.indexOf('--data')
  if (index !== -1) {
    dataDir = args[index + 1]
    if (!dataDir) throw new Error('--data needs a folder')
    args.splice(index, 2)
  }
  let webPort = process.env.MATKO_SEED_WEB_PORT || null
  const webIndex = args.indexOf('--web')
  if (webIndex !== -1) {
    webPort = args[webIndex + 1]
    if (!webPort) throw new Error('--web needs a port')
    args.splice(webIndex, 2)
  }
  let web = null
  if (webPort) {
    const port = Number.parseInt(webPort, 10)
    if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error(`"${webPort}" is not a port`)
    web = {
      host: process.env.MATKO_SEED_WEB_HOST || '127.0.0.1',
      open: process.env.MATKO_SEED_WEB_OPEN === '1',
      password: process.env.MATKO_SEED_WEB_PASSWORD || '',
      port,
    }
  }
  return { args, dataDir: path.resolve(dataDir), web, ...spaceLimits() }
}

function spaceLimits() {
  const size = (name, fallback) => {
    const text = process.env[name]
    if (!text) return fallback
    const bytes = parseSize(text)
    if (bytes === null) throw new Error(`${name}="${text}" is not a size, like 40GB or 500MB`)
    return bytes
  }
  return { maxStore: size('MATKO_SEED_MAX_SIZE', null), minFree: size('MATKO_SEED_MIN_FREE', DEFAULT_MIN_FREE) }
}

function requireCode(input) {
  const code = codeFromInput(input)
  if (!code) throw new Error(`"${input ?? ''}" is not a Matko code or matko://import link.`)
  return code
}

function printStatus(dataDir) {
  const listed = readKeptList(dataDir)
  const file = path.join(dataDir, STATUS_FILE)
  const status = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
  const fresh = status && Date.now() - Date.parse(status.updatedAt) < STALE_MS
  const running = Boolean(status?.running && fresh && isRunning(status.pid))
  console.log(running ? `Running (pid ${status.pid}) on ${dataDir}` : `Not running on ${dataDir}${status ? ` (last seen ${status.updatedAt})` : ''}`)
  if (listed.length === 0) {
    console.log('Nothing to keep yet: node seeder/cli.mjs add <code>')
    return
  }
  const kept = status?.kept ?? []
  const byCode = new Map(kept.map((entry) => [entry.driveKey, entry]))
  const line = (entry, indent) => {
    const name = entry.title ? `${entry.title} (${entry.kind})` : (entry.kind ?? 'unknown')
    const detail =
      entry.state === 'kept'
        ? `kept ${entry.version ?? ''}, ${entry.kept?.files ?? 0} files, since ${entry.kept?.keptAt ?? '?'}`
        : entry.state === 'error'
          ? `error: ${entry.error}`
          : 'fetching'
    console.log(`${indent}${short(entry.driveKey)}  ${name}  ${detail}  ${entry.peers} peer(s)`)
  }
  // Under each, what it's kept for: a channel's courses and programs, a
  // program's courses (SLJ-194).
  const printListed = (code, depth, seen) => {
    for (const entry of kept) {
      if (entry.via !== code || seen.has(entry.driveKey)) continue
      seen.add(entry.driveKey)
      line(entry, `  ${'    '.repeat(depth)}└ `)
      printListed(entry.driveKey, depth + 1, seen)
    }
  }
  const seen = new Set()
  for (const { code } of listed) {
    const entry = byCode.get(code)
    if (!entry) {
      console.log(`  ${short(code)}  ${status?.waiting?.includes(code) ? 'waiting for space' : 'waiting to start'}`)
      continue
    }
    seen.add(code)
    line(entry, '  ')
    printListed(code, 0, seen)
  }
}

async function main(argv) {
  const { args, dataDir, maxStore, minFree, web } = parse(argv)
  const [command, input] = args
  switch (command) {
    case 'run': {
      const { done } = await runSeeder({ dataDir, handleSignals: true, maxStore, minFree, web })
      return done
    }
    case 'add': {
      const code = requireCode(input)
      console.log(addCode(dataDir, code) ? `Added ${short(code)}.` : `${short(code)} is already on the list.`)
      return 0
    }
    case 'remove': {
      const code = requireCode(input)
      console.log(removeCode(dataDir, code) ? `Removed ${short(code)}.` : `${short(code)} wasn't on the list.`)
      return 0
    }
    case 'list': {
      const listed = readKeptList(dataDir)
      for (const { addedAt, code } of listed) console.log(`${code}  added ${addedAt}`)
      if (listed.length === 0) console.log('The list is empty.')
      return 0
    }
    case 'status':
      printStatus(dataDir)
      return 0
    default:
      console.log(USAGE)
      return command && command !== 'help' && command !== '--help' ? 1 : 0
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (error) => {
    console.error(error.message)
    process.exit(1)
  },
)
