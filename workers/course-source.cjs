// `source.json` sits in every shared course's drive next to the version's files:
// `{ driveKey, publisher: { id } }`, where the course is shared from (see
// "source.json" in docs/contracts.md §5). On import it must name the drive the
// course was actually fetched from. That proves consistency, not who published it
// (`publisher.id` is unverified until SLJ-18): it catches a copy re-shared from
// another drive with the original source.json left inside.
//
// Kept apart from workers/main.cjs so vitest can test it
// (workers/course-source.test.mjs); CommonJS for the Bare worker.
const IdEncoding = require('hypercore-id-encoding')

function sameKey(a, b) {
  try {
    return IdEncoding.normalize(a) === IdEncoding.normalize(b)
  } catch {
    return false
  }
}

// `sourceText` is the file's contents (or null if it's missing); `driveKey` the
// key the course was imported from (z32/hex string or Buffer). Returns the
// claimed publisher id, or throws when the file is missing, invalid, or names
// another drive.
function verifySource(sourceText, driveKey) {
  let source

  try {
    source = JSON.parse(sourceText)
  } catch {
    throw new Error("This course has no valid source.json, so it can't be imported")
  }

  if (!source || typeof source.driveKey !== 'string') {
    throw new Error("This course has no valid source.json, so it can't be imported")
  }

  if (!sameKey(source.driveKey, driveKey)) {
    throw new Error('This course says it is shared from a different address than the code used')
  }

  return typeof source.publisher?.id === 'string' ? source.publisher.id : ''
}

// "This course moved" (SLJ-11): a course's drive can name the drive it
// continues in (`movedTo.driveKey`), when it becomes a course shared by several
// maintainers (a new code). The notice is only as trustworthy as the drive it's
// read from: it must be that drive's own source.json (`driveKey` names it),
// written by whoever signs that drive. Returns the new drive's key (z32), or
// null when the course hasn't moved or the notice isn't valid.
function movedToKey(sourceText, driveKey) {
  let source
  try {
    source = JSON.parse(sourceText)
  } catch {
    return null
  }
  if (!source || !sameKey(source.driveKey, driveKey)) return null
  const target = source.movedTo?.driveKey
  if (typeof target !== 'string') return null
  try {
    const normalized = IdEncoding.normalize(target)
    return sameKey(normalized, driveKey) ? null : normalized
  } catch {
    return null
  }
}

// The drive paths (`/section/lesson.json`) whose contents are the same in the
// drive's version and the one installed, by the file hashes each version's
// version-meta.json records. An update skips them: comparing them otherwise
// streams both copies, which on a drive this device never downloaded (a moved
// course's new one) means fetching every unchanged file, assets included.
// `remoteText` / `localText`: the two version-meta.json files (or null).
function unchangedFileKeys(remoteText, localText) {
  const hashes = (text) => {
    try {
      const fileHashes = JSON.parse(text)?.fileHashes
      return fileHashes && typeof fileHashes === 'object' ? fileHashes : {}
    } catch {
      return {}
    }
  }
  const remote = hashes(remoteText)
  const local = hashes(localText)
  const unchanged = new Set()
  for (const [relativePath, hash] of Object.entries(remote)) {
    if (typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash) && local[relativePath] === hash) {
      unchanged.add('/' + relativePath.replace(/\\/g, '/'))
    }
  }
  return unchanged
}

module.exports = { movedToKey, unchangedFileKeys, verifySource }
