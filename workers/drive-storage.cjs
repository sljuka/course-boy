// Old versions' file data (SLJ-113). A Hyperdrive never edits in place:
// replacing or removing a file appends or drops an index entry, and the old
// file's blocks stay in the drive's file-data core, on every computer holding
// it. Nobody needs them: imports and updates fetch only the current version's
// files, and going back to an earlier version uses the student's own copies
// (versions/<v>/). So the blocks no file of the current version points to are
// cleared, freeing the space; the file index (small) stays whole.
//
// Never for a shared course's drive on a maintainer's computer: a proposal
// starts with a copy of all its blocks (shared-course.cjs), so maintainers
// keep its whole history. The worker calls this for students' followed
// drives only: on the drive a teacher publishes from, it broke students'
// next update (SLJ-114). A Hypercore bug: a student connected while the
// teacher clears forgets that the teacher still has the blocks after the
// cleared range, so it never asks for the new version's files
// (https://github.com/holepunchto/hypercore/issues/891). Turn it on there
// once a Hypercore release fixes that.
//
// Only with a Hypercore whose `clear` keeps the tree nodes of blocks outside
// the range (fixed in 11.37.2). Before that, clearing a range that starts
// right after a block that stays also deleted that block's tree node: this
// computer kept its data but could no longer prove it to a peer, so a new
// student couldn't fetch it. With an older Hypercore nothing is cleared.
//
// No Bare specifics: tested in vitest (drive-storage.test.mjs).

// The first Hypercore whose `clear` is safe here (see above).
const SAFE_HYPERCORE = [11, 37, 2]

function hypercoreVersion() {
  try {
    return require('hypercore/package.json').version
  } catch {
    return null
  }
}

function clearingIsSafe(version = hypercoreVersion()) {
  const parts = typeof version === 'string' ? version.split('.').map((part) => parseInt(part, 10)) : []
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return false
  for (let index = 0; index < 3; index++) {
    if (parts[index] !== SAFE_HYPERCORE[index]) return parts[index] > SAFE_HYPERCORE[index]
  }
  return true
}

// The block ranges [start, end) of the file-data core the current version's
// files use, merged and sorted.
async function rangesInUse(drive) {
  const ranges = []
  for await (const entry of drive.list('/', { recursive: true })) {
    const blob = entry.value.blob
    if (blob && blob.blockLength > 0) ranges.push([blob.blockOffset, blob.blockOffset + blob.blockLength])
  }
  ranges.sort((left, right) => left[0] - right[0])
  const merged = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  return merged
}

// Clears the file-data blocks the drive's current version doesn't use.
// Returns how many blocks were in the cleared ranges (whether this computer
// held them or not); 0 with a Hypercore where it isn't safe.
//
// Works on one version, fixed when it starts: the drive may be written again
// meanwhile (a Publish writes source.json again when the course is shared),
// and blocks appended after that version belong to the next one. So the files
// are listed at that version, and nothing at or past its file data's length
// is touched.
async function clearOldVersions(drive, { safe = clearingIsSafe() } = {}) {
  if (!safe) return 0
  await drive.ready()
  const version = drive.version
  if (version === 0) return 0
  const blobs = (await drive.getBlobs())?.core
  if (!blobs) return 0
  const blobsLength = await drive.getBlobsLength(version)
  if (!blobsLength) return 0

  const snapshot = drive.checkout(version)
  let inUse
  try {
    inUse = await rangesInUse(snapshot)
  } finally {
    await snapshot.close()
  }
  let next = 0
  let cleared = 0
  for (const [start, end] of [...inUse, [blobsLength, blobsLength]]) {
    const stop = Math.min(start, blobsLength)
    if (stop > next) {
      await blobs.clear(next, stop)
      cleared += stop - next
    }
    next = Math.max(next, end)
  }
  return cleared
}

module.exports = { clearOldVersions, clearingIsSafe, rangesInUse }
