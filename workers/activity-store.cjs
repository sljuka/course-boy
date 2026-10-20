// Course activity on this device (SLJ-168), next to the board's files:
//
// - **Events passed on** (`<board>.activity.jsonl`, students' devices): the
//   sealed events this device has, its own and classmates', kept until they
//   are MAX_AGE_DAYS old, at most MAX_EVENTS (the oldest go first). Apart
//   from the messages' limit: events are tiny. Over a limit the file is
//   rewritten (temporary file, then renamed over it).
// - **Totals** (`activity-<course id>.json`, the teacher's device): counts
//   per event, and which keys were counted (the first 16 bytes), never what
//   each key said. Named by the course's id, not its code, so a course that
//   moves keeps its totals.
//
// Events come here already checked (activity-events.cjs).
//
// `fs` is bare-fs/promises in the worker and node:fs/promises in tests.

const { cleanActivityEvent, dayOf } = require('./activity-events.cjs')

const MAX_EVENTS = 5000
const MAX_AGE_DAYS = 180
// Rewritten when this many lines of the file are no longer kept.
const COMPACT_AFTER = 500

function createWriter(fs) {
  let writing = Promise.resolve()
  return {
    queue(write) {
      writing = writing.then(write).catch((error) => console.error('[worker] saving activity failed:', error?.message ?? error))
      return writing
    },
    async replaceFile(file, content) {
      const temporary = `${file}.tmp`
      await fs.writeFile(temporary, content)
      await fs.rename(temporary, file)
    },
    flush() {
      return writing
    },
  }
}

async function openActivityRelay({ boardKey, folder, fs, now = () => Date.now() }) {
  const file = `${folder}/${boardKey.toString('hex')}.activity.jsonl`
  await fs.mkdir(folder, { recursive: true })
  const writer = createWriter(fs)
  // Event key -> event, oldest day first (in the order kept).
  const events = new Map()
  let dropped = 0

  function isTooOld(event) {
    return event.day < dayOf(now()) - MAX_AGE_DAYS
  }

  function rewrite() {
    dropped = 0
    const content = [...events.values()].map((event) => `${JSON.stringify(event)}\n`).join('')
    writer.queue(() => writer.replaceFile(file, content))
  }

  // Too old or too many: the oldest days go.
  function prune() {
    let changed = false
    for (const [key, event] of events) {
      if (!isTooOld(event)) continue
      events.delete(key)
      dropped += 1
      changed = true
    }
    if (events.size > MAX_EVENTS) {
      const byDay = [...events.values()].sort((a, b) => a.day - b.day)
      for (const event of byDay.slice(0, events.size - MAX_EVENTS)) {
        events.delete(event.key)
        dropped += 1
      }
      changed = true
    }
    if (changed && dropped >= COMPACT_AFTER) rewrite()
    return changed
  }

  // Loading: a damaged line (a crash mid-append) is skipped.
  const saved = await fs.readFile(file, 'utf8').catch(() => '')
  let lines = 0
  for (const line of saved.split('\n')) {
    if (!line) continue
    lines += 1
    try {
      const event = cleanActivityEvent(JSON.parse(line))
      if (typeof event.key === 'string' && !events.has(event.key)) events.set(event.key, event)
    } catch {}
  }
  dropped = lines - events.size
  prune()
  if (dropped > 0) rewrite()

  return {
    get size() {
      return events.size
    },

    has(key) {
      return events.has(key)
    },

    // Keeps a checked event: 'added', or 'duplicate' (this key's event is
    // already here: the first one stays) or 'too-old'.
    add(event) {
      const clean = cleanActivityEvent(event)
      if (events.has(clean.key)) return 'duplicate'
      if (isTooOld(clean)) return 'too-old'
      events.set(clean.key, clean)
      if (prune() && !events.has(clean.key)) return 'too-old'
      writer.queue(() => fs.appendFile(file, `${JSON.stringify(clean)}\n`))
      return 'added'
    },

    // Newest first, at most `limit`.
    newest(limit) {
      return [...events.values()].sort((a, b) => b.day - a.day).slice(0, limit)
    },

    flush: writer.flush,

    async destroy() {
      await writer.flush()
      await fs.rm(file, { force: true })
    },
  }
}

// Which counter an event adds to: "imported", "started", "finished/2",
// "section/1/<section id>", "end/1/75-99".
function counterOf(payload) {
  if (payload.kind === 'imported' || payload.kind === 'started') return payload.kind
  if (payload.kind === 'finished') return `finished/${payload.attempt}`
  if (payload.kind === 'section') return `section/${payload.attempt}/${payload.section}`
  return `end/${payload.attempt}/${payload.band}`
}

// The counters charts follow day by day (later, SLJ-172).
const DAILY = new Set(['finished/1', 'imported', 'started'])

async function openActivityTotals({ courseId, folder, fs }) {
  const file = `${folder}/activity-${courseId}.json`
  await fs.mkdir(folder, { recursive: true })
  const writer = createWriter(fs)
  let totals = { counted: [], counts: {}, days: {}, v: 1 }
  try {
    const saved = JSON.parse(await fs.readFile(file, 'utf8'))
    if (saved?.v === 1 && Array.isArray(saved.counted)) totals = saved
  } catch {}
  const counted = new Set(totals.counted)

  return {
    // The newest counted keys (prefixes), for a device to see what's here.
    recentIds(limit) {
      return totals.counted.slice(-limit)
    },

    hasCounted(key) {
      return counted.has(key.slice(0, 32))
    },

    // Counts an opened event once per key. True when it was new.
    count(key, day, payload) {
      const id = key.slice(0, 32)
      if (counted.has(id)) return false
      counted.add(id)
      totals.counted.push(id)
      const counter = counterOf(payload)
      totals.counts[counter] = (totals.counts[counter] ?? 0) + 1
      if (DAILY.has(counter)) {
        const daily = (totals.days[day] ??= {})
        daily[counter] = (daily[counter] ?? 0) + 1
      }
      const content = JSON.stringify(totals)
      writer.queue(() => writer.replaceFile(file, content))
      return true
    },

    read() {
      return { counted: totals.counted.length, counts: { ...totals.counts }, days: { ...totals.days } }
    },

    flush: writer.flush,
  }
}

module.exports = { MAX_AGE_DAYS, MAX_EVENTS, openActivityRelay, openActivityTotals }
