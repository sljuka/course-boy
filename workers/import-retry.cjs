// Downloads that try again when the connection fails (SLJ-173).
//
// An import or update waits as long as it takes for someone sharing the
// course to be online, but once files are coming a peer can drop off, a read
// can time out, a connection can reset. Those are worth another go: the
// blocks that already arrived stay in the store, so a second attempt only
// fetches what's missing. What isn't worth another go are answers about the
// course or this device, which come out the same every time: over the
// download limits, not enough space, links to files outside the course, or
// the student cancelling.
//
// No Bare specifics (import-retry.test.mjs runs it in Node).

// Pauses before the second and third attempt.
const RETRY_PAUSES_MS = Object.freeze([2_000, 5_000])

// Error codes that are answers, not connection trouble.
const FINAL_CODES = new Set([
  'CANCELLED',
  'COURSE_TOO_BIG',
  'NOT_ENOUGH_SPACE',
  'NOT_MATKO',
  'NEWER_FORMAT',
  'SYMLINK_REFUSED',
  'TOO_MANY_FILES',
])

function isRetryableDownloadError(error) {
  if (!error) return false
  return !FINAL_CODES.has(error.code)
}

// Runs `attempt` until it succeeds, trying again after each pause in
// `pauses` when it fails with connection trouble. `onRetry(n)` is told before
// the pause for attempt n (2, 3, …); `isCancelled()` stops at once; `sleep`
// waits (and may reject when the transfer is cancelled).
async function withDownloadRetries(attempt, { isCancelled = () => false, onRetry = () => {}, pauses = RETRY_PAUSES_MS, sleep }) {
  for (let index = 0; ; index += 1) {
    try {
      return await attempt(index + 1)
    } catch (error) {
      if (isCancelled() || index >= pauses.length || !isRetryableDownloadError(error)) throw error
      onRetry(index + 2, error)
      await sleep(pauses[index])
      if (isCancelled()) throw error
    }
  }
}

module.exports = { RETRY_PAUSES_MS, isRetryableDownloadError, withDownloadRetries }
