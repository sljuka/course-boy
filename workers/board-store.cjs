// A course board's messages on this device (SLJ-149): the newest that fit
// this device's limit, kept in a file of their own, plus the newest
// moderation list seen.
//
// - `<board>.messages.jsonl`: one message per line, appended as they arrive.
//   Over the limit, the oldest are dropped and the file is rewritten (to a
//   temporary file, then renamed over it), down to COMPACT_TO of the limit
//   so it isn't rewritten for every message after.
// - `<board>.moderation.json`: the moderation list, replaced the same way.
//
// Messages come here already checked (board-messages.cjs); what depends on
// the board is checked here: blocked senders and the rate limit. Hidden
// messages and blocked senders' messages are kept (a teacher's archive keeps
// them) but never read out or passed on.
//
// `fs` is bare-fs/promises in the worker and node:fs/promises in tests (so
// no bare-path either: a forward slash works on every platform).

const { RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS, cleanMessage, messageId } = require('./board-messages.cjs')

const COMPACT_TO = 0.9

// Newest first; the same date ordered by id, so every device lists the same
// messages in the same order.
function isNewer(a, b) {
  return a.message.date !== b.message.date ? a.message.date > b.message.date : a.id > b.id
}

// `teacherKey`: the course's own key, whose messages have no rate limit.
async function openBoardStore({ boardKey, folder, fs, limitBytes, teacherKey }) {
  const boardHex = boardKey.toString('hex')
  const teacherHex = teacherKey.toString('hex')
  const messagesFile = `${folder}/${boardHex}.messages.jsonl`
  const moderationFile = `${folder}/${boardHex}.moderation.json`
  await fs.mkdir(folder, { recursive: true })

  // Newest first.
  const entries = []
  const byId = new Map()
  // Each sender's message dates, for the rate limit.
  const datesByAuthor = new Map()
  let totalBytes = 0
  let moderation = null
  let hidden = new Set()
  let blocked = new Set()
  let writing = Promise.resolve()

  function queue(write) {
    writing = writing.then(write).catch((error) => console.error('[worker] saving the board failed:', error?.message ?? error))
    return writing
  }

  async function replaceFile(file, content) {
    const temporary = `${file}.tmp`
    await fs.writeFile(temporary, content)
    await fs.rename(temporary, file)
  }

  function insert(message) {
    const line = JSON.stringify(message)
    const entry = { bytes: Buffer.byteLength(line) + 1, id: messageId(message), line, message }
    let low = 0
    let high = entries.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (isNewer(entries[middle], entry)) low = middle + 1
      else high = middle
    }
    entries.splice(low, 0, entry)
    byId.set(entry.id, entry)
    const dates = datesByAuthor.get(message.author) ?? []
    dates.push(message.date)
    datesByAuthor.set(message.author, dates)
    totalBytes += entry.bytes
    return entry
  }

  function dropOldest() {
    const entry = entries.pop()
    byId.delete(entry.id)
    const dates = datesByAuthor.get(entry.message.author)
    dates.splice(dates.indexOf(entry.message.date), 1)
    if (dates.length === 0) datesByAuthor.delete(entry.message.author)
    totalBytes -= entry.bytes
  }

  // Over the limit: drop the oldest and rewrite the file. True when it did.
  function compact() {
    if (totalBytes <= limitBytes) return false
    while (entries.length > 0 && totalBytes > limitBytes * COMPACT_TO) dropOldest()
    const content = entries
      .slice()
      .reverse()
      .map((entry) => `${entry.line}\n`)
      .join('')
    queue(() => replaceFile(messagesFile, content))
    return true
  }

  function applyModeration(list) {
    moderation = list
    hidden = new Set(list?.hidden ?? [])
    blocked = new Set(list?.blocked ?? [])
  }

  function isVisible(entry) {
    return !hidden.has(entry.id) && !blocked.has(entry.message.author)
  }

  // Loading: a damaged line (a crash mid-append) is skipped.
  const saved = await fs.readFile(messagesFile, 'utf8').catch(() => '')
  for (const line of saved.split('\n')) {
    if (!line) continue
    try {
      const message = cleanMessage(JSON.parse(line))
      if (!byId.has(messageId(message))) insert(message)
    } catch {}
  }
  compact()
  try {
    applyModeration(JSON.parse(await fs.readFile(moderationFile, 'utf8')))
  } catch {}

  return {
    get moderation() {
      return moderation
    },
    get totalBytes() {
      return totalBytes
    },

    has(id) {
      return byId.has(id)
    },

    // Whether a sender has already sent RATE_LIMIT_COUNT messages in the
    // window before this one. The teacher (the course's key) has no limit.
    isRateLimited(message) {
      if (message.author === teacherHex) return false
      const from = message.date - RATE_LIMIT_WINDOW_MS
      let count = 0
      for (const date of datesByAuthor.get(message.author) ?? []) {
        if (date > from && date <= message.date) count += 1
      }
      return count >= RATE_LIMIT_COUNT
    },

    // Keeps a checked message. 'added', or why it wasn't: 'duplicate',
    // 'blocked', 'rate-limited', or 'too-old' (older than everything kept,
    // with no room for it).
    add(message) {
      const clean = cleanMessage(message)
      const id = messageId(clean)
      if (byId.has(id)) return { id, status: 'duplicate' }
      if (blocked.has(clean.author)) return { id, status: 'blocked' }
      if (this.isRateLimited(clean)) return { id, status: 'rate-limited' }
      const entry = insert(clean)
      if (compact()) return { id, status: byId.has(id) ? 'added' : 'too-old' }
      queue(() => fs.appendFile(messagesFile, `${entry.line}\n`))
      return { id, status: 'added' }
    },

    // Visible messages, newest first: at most `limit`, older than `before`
    // (a message's date and id, from a previous page) when given.
    read({ before = null, limit = 50 } = {}) {
      const page = []
      for (const entry of entries) {
        if (page.length >= limit) break
        if (before && !isNewer({ id: before.id, message: { date: before.date } }, entry)) continue
        if (isVisible(entry)) page.push({ id: entry.id, message: entry.message })
      }
      return page
    },

    // Ids of the newest kept messages (visible or not), for a peer to see
    // what this device already has.
    newestIds(limit) {
      return entries.slice(0, limit).map((entry) => entry.id)
    },

    // A newer moderation list than the one kept (a higher seq): kept, and
    // true. The list must already be checked (verifiedModeration).
    setModeration(list) {
      if (moderation && moderation.seq >= list.seq) return false
      applyModeration(list)
      queue(() => replaceFile(moderationFile, JSON.stringify(list)))
      return true
    },

    setLimit(bytes) {
      limitBytes = bytes
      compact()
    },

    // Waits for every write so far.
    flush() {
      return writing
    },

    // Deletes the board's files (the course was removed).
    async destroy() {
      await writing
      await fs.rm(messagesFile, { force: true })
      await fs.rm(moderationFile, { force: true })
    },
  }
}

module.exports = { openBoardStore }
