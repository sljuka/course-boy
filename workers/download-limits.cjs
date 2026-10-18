// How much a download from a drive may bring onto this computer (SLJ-153).
//
// A drive's contents are whatever its publisher chose: tens of GB, or
// millions of tiny files, and one "Import course" or one applied update would
// fill the student's disk. Twice over, too: the blocks land in the worker's
// store (`p2p/`) and are copied onto disk, and stay while the course is
// shared on.
//
// So every copy of a drive onto disk is planned first (`planDownload`): the
// mirror's dry run lists what it would write, adding up files and bytes from
// the drive's entries (no file data is fetched for that), and stops at the
// first file over a limit, so a hostile drive is refused before anything of
// it is downloaded or written, and its listing is cut short. Then the free
// space is checked (`assertFreeSpace`).
//
// Each refusal is an Error whose message starts with its code
// (`COURSE_TOO_BIG: …`): Electron's IPC keeps only an error's message, so
// that's how the window recognises it and says it in the student's language
// (src/lib/transfer-errors.ts).
//
// No Bare specifics: the drive and `fsp` are passed in (download-limits.test.mjs
// runs it in Node).

const GiB = 1024 ** 3

// The window's messages name the first two numbers (`transfer.errors` in
// src/locales): change them together.
const DOWNLOAD_LIMITS = Object.freeze({
  // A course with video is legitimately big; past this it's not a course.
  maxBytes: 20 * GiB,
  // Courses have a few hundred files at most (lessons, tests, images).
  maxFiles: 50_000,
  // Left free on the disk after the download (and its copy in the store).
  spareBytes: 1 * GiB,
})

function limitError(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code })
}

async function blobSize(drive, key) {
  const entry = await drive.entry(key)
  return entry && entry.value.blob ? entry.value.blob.byteLength : 0
}

// What copying `drive` into `local` would write: `{ bytes, files }`. Throws
// TOO_MANY_FILES or COURSE_TOO_BIG at the first file over a limit.
// `onEntry(diff)`: called for each listed entry (a cancel check, or counting
// what's in it).
async function planDownload(drive, local, { filter = null, limits = DOWNLOAD_LIMITS, onEntry = () => {} } = {}) {
  let bytes = 0
  let files = 0
  for await (const diff of drive.mirror(local, { dryRun: true, filter })) {
    onEntry(diff)
    if (diff.op !== 'add' && diff.op !== 'change') continue
    files += 1
    if (files > limits.maxFiles) {
      throw limitError('TOO_MANY_FILES', `More than ${limits.maxFiles} files`)
    }
    bytes += await blobSize(drive, diff.key)
    if (bytes > limits.maxBytes) {
      throw limitError('COURSE_TOO_BIG', `More than ${limits.maxBytes} bytes`)
    }
  }
  return { bytes, files }
}

// Refuses (NOT_ENOUGH_SPACE) when `bytes` coming in twice (the store and the
// copy on disk) would leave less than `spareBytes` free on the disk holding
// `folder`. A disk whose free space can't be read isn't refused.
async function assertFreeSpace(fsp, folder, bytes, { limits = DOWNLOAD_LIMITS } = {}) {
  const stats = await fsp.statfs(folder).catch(() => null)
  if (!stats) return
  const free = stats.bavail * stats.bsize
  const needed = bytes * 2 + limits.spareBytes
  if (free < needed) {
    throw limitError('NOT_ENOUGH_SPACE', `Needs ${needed} bytes free, ${free} are`)
  }
}

module.exports = { DOWNLOAD_LIMITS, assertFreeSpace, blobSize, planDownload }
