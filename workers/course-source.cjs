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

module.exports = { verifySource }
