// Disk space (SLJ-194): how much the seeder may use, so an always-on box never
// fills its disk with courses.
//
// Two limits, both checked before a new code starts being kept:
// - `maxStore`: a cap on the seeder's own store (MATKO_SEED_MAX_SIZE, e.g.
//   "40GB"); none unless set.
// - `minFree`: free disk space that must stay free (MATKO_SEED_MIN_FREE,
//   default 1 GB), for the box's other apps.
//
// When either is reached, a new code waits ("waiting for space") until there's
// room again. What's already kept stays online and still gets its new
// versions: stopping those would leave students on an old version, and a
// limit can't shrink what's kept anyway (removing something does).
import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_MIN_FREE = 1024 ** 3

const UNITS = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }

// "40GB", "500 MB", "1.5 TB" or a number of bytes; the units are binary
// (1 GB = 1024 MB), like the page shows them. Null for anything else.
export function parseSize(text) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?\s*$/i.exec(String(text ?? ''))
  if (!match) return null
  return Math.floor(Number(match[1]) * UNITS[(match[2] ?? 'B').toUpperCase()])
}

// Free and total space of the disk `dir` is on; null when it can't be read.
export function diskOf(dir) {
  try {
    const stats = fs.statfsSync(dir)
    return { free: stats.bavail * stats.bsize, total: stats.blocks * stats.bsize }
  } catch {
    return null
  }
}

// Bytes used by every file under `dir` (0 when it doesn't exist yet).
export function folderSize(dir) {
  let total = 0
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) total += folderSize(file)
    else if (entry.isFile()) {
      try {
        total += fs.statSync(file).size
      } catch {
        // gone meanwhile
      }
    }
  }
  return total
}

// Whether a new code can start, and what the page should say:
// - `full`: "cap" (the store reached `maxStore`), "disk" (less than `minFree`
//   left), or null.
// - `low`: not full yet but close (under twice `minFree` left, or 90% of the
//   cap used), for a warning before it's full.
export function spaceState({ disk, maxStore = null, minFree = DEFAULT_MIN_FREE, storeBytes }) {
  const free = disk?.free ?? null
  const full = maxStore !== null && storeBytes >= maxStore ? 'cap' : free !== null && free < minFree ? 'disk' : null
  const low =
    full === null && ((free !== null && free < minFree * 2) || (maxStore !== null && storeBytes >= maxStore * 0.9))
  return { free, full, low, maxStore, minFree, storeBytes, total: disk?.total ?? null }
}
