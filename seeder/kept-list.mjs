// The seeder's list of codes to keep (SLJ-144): `<data>/kept.json`, edited by
// `add` and `remove` and read by `run`, which keeps every code on it and
// notices when it changes. Written atomically: a temp file, then a rename.
import fs from 'node:fs'
import path from 'node:path'
import IdEncoding from 'hypercore-id-encoding'

export const KEPT_FILE = 'kept.json'

// The code in what was given: a share code (z-base-32 or hex, as the app's
// Share shows it) or an import link (`matko://import/<code>`), normalized to
// z-base-32. Null for anything else.
export function codeFromInput(input) {
  const text = String(input ?? '').trim()
  const link = /^matko:\/\/import\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(text)
  const candidate = (link ? decodeURIComponent(link[1]) : text).toLowerCase()
  if (!/^(?:[ybndrfg8ejkmcpqxot1uwisza345h769]{52}|[0-9a-f]{64})$/.test(candidate)) return null
  try {
    return IdEncoding.normalize(candidate)
  } catch {
    return null
  }
}

// [{ code, addedAt }], oldest first; empty if there's no list yet. A list
// that can't be read is an error, never treated as empty (that would drop
// every course).
export function readKeptList(dataDir) {
  const file = path.join(dataDir, KEPT_FILE)
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed?.codes)) throw new Error(`${file} has no "codes" list`)
  return parsed.codes.filter((entry) => typeof entry?.code === 'string' && codeFromInput(entry.code))
}

function writeKeptList(dataDir, codes) {
  fs.mkdirSync(dataDir, { recursive: true })
  const file = path.join(dataDir, KEPT_FILE)
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify({ codes }, null, 2) + '\n')
  fs.renameSync(temp, file)
}

// Adds a code; false if it was already on the list.
export function addCode(dataDir, code, now = new Date()) {
  const codes = readKeptList(dataDir)
  if (codes.some((entry) => entry.code === code)) return false
  writeKeptList(dataDir, [...codes, { addedAt: now.toISOString(), code }])
  return true
}

// Removes a code; false if it wasn't on the list.
export function removeCode(dataDir, code) {
  const codes = readKeptList(dataDir)
  const left = codes.filter((entry) => entry.code !== code)
  if (left.length === codes.length) return false
  writeKeptList(dataDir, left)
  return true
}
