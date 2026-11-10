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

const USAGE = `Usage: node seeder/cli.mjs <command> [--data <dir>]

  run              Keep every code on the list online (runs until stopped)
  add <code|link>  Add a course, program or channel by its code or matko:// link
  remove <code>    Stop keeping it
  list             The codes on the list
  status           What the running seeder keeps now

--data <dir>  Where the seeder keeps everything (default: $MATKO_SEED_DATA,
              or ~/.matko-seed). One running seeder per folder.`

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
  return { args, dataDir: path.resolve(dataDir) }
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
  const byCode = new Map((status?.kept ?? []).map((entry) => [entry.driveKey, entry]))
  for (const { code } of listed) {
    const entry = byCode.get(code)
    if (!entry) {
      console.log(`  ${short(code)}  waiting to start`)
      continue
    }
    const name = entry.title ? `${entry.title} (${entry.kind})` : (entry.kind ?? 'unknown')
    const detail =
      entry.state === 'kept'
        ? `kept ${entry.version ?? ''}, ${entry.kept?.files ?? 0} files, since ${entry.kept?.keptAt ?? '?'}`
        : entry.state === 'error'
          ? `error: ${entry.error}`
          : 'fetching'
    console.log(`  ${short(code)}  ${name}  ${detail}  ${entry.peers} peer(s)`)
  }
}

async function main(argv) {
  const { args, dataDir } = parse(argv)
  const [command, input] = args
  switch (command) {
    case 'run': {
      const { done } = await runSeeder({ dataDir, handleSignals: true })
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
