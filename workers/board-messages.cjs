// A course board's messages and moderation list (SLJ-149): what they hold, how
// they're signed, and what a device accepts from another.
//
// A board belongs to a course and is named by the course's drive key (its
// code). Two kinds of signed records travel on it:
//
// - **Messages:** a name and a short text, signed by the sender's own key for
//   this course (a student's comes from their worker's store, one per course,
//   so a student can't be linked across courses; the teacher's is the course's
//   own key, which is what gives their messages the "Teacher" badge nobody
//   else can fake).
// - **The moderation list:** signed by the course's key only (the
//   `teacherKey`: the key that signs the course's drive; the code is a hash
//   of the drive's manifest, which names that key). It turns the
//   board on, sets the students' storage limit, and lists hidden messages and
//   blocked senders. A newer list (higher `seq`) replaces an older one; a list
//   signed by anyone else is ignored.
//
// Records travel as JSON with keys and signatures in hex. What's signed is a
// fixed byte layout built from the fields (signablePayload /
// moderationPayload), never the JSON itself, so key order or whitespace can't
// change a signature. Every check here is pure, so it's the same on every
// device and covered by board-messages.test.mjs.

const sodium = require('sodium-native')

const MESSAGE_CONTEXT = Buffer.from('matko-board-message/1')
const MODERATION_CONTEXT = Buffer.from('matko-board-moderation/1')

// What a message may hold. Characters are counted as people see them
// (graphemes: "👍🏽" is one), bytes as UTF-8, so a short text of rare
// characters can't get large.
const MAX_TEXT_GRAPHEMES = 256
const MAX_TEXT_BYTES = 1024
const MAX_NAME_GRAPHEMES = 40
const MAX_NAME_BYTES = 160
// A message dated later than this ahead of the receiver's clock is refused,
// so a forged date can't pin a message to the top for good.
const MAX_CLOCK_AHEAD_MS = 5 * 60_000
// At most this many messages per sender in any window this long (rolling).
// The teacher (the course's key) has no limit.
const RATE_LIMIT_COUNT = 10
const RATE_LIMIT_WINDOW_MS = 2 * 24 * 60 * 60_000

// What a moderation list may hold, so one can't grow without bound.
const MAX_HIDDEN = 5000
const MAX_BLOCKED = 2000
// The students' storage limit the teacher may set, and its default.
const DEFAULT_STUDENT_LIMIT_BYTES = 10 * 1024 * 1024
const MIN_STUDENT_LIMIT_BYTES = 256 * 1024
const MAX_STUDENT_LIMIT_BYTES = 100 * 1024 * 1024

const HEX_KEY = /^[0-9a-f]{64}$/
const HEX_SIGNATURE = /^[0-9a-f]{128}$/
const HEX_ID = /^[0-9a-f]{32}$/

const segmenter = new Intl.Segmenter()

function countGraphemes(text) {
  let count = 0
  for (const _ of segmenter.segment(text)) count += 1
  return count
}

// Why a name or text isn't allowed, or null.
function textProblem(text, { maxGraphemes, maxBytes, required }) {
  if (typeof text !== 'string') return 'invalid'
  if (required && text.trim() === '') return 'empty'
  if (Buffer.byteLength(text) > maxBytes || countGraphemes(text) > maxGraphemes) return 'too-long'
  return null
}

function nameProblem(name) {
  return textProblem(name, { maxBytes: MAX_NAME_BYTES, maxGraphemes: MAX_NAME_GRAPHEMES, required: false })
}

function messageTextProblem(text) {
  return textProblem(text, { maxBytes: MAX_TEXT_BYTES, maxGraphemes: MAX_TEXT_GRAPHEMES, required: true })
}

function hash(parts, length = 32) {
  const out = Buffer.alloc(length)
  sodium.crypto_generichash_batch(out, parts)
  return out
}

function lengthPrefixed(text, bytes) {
  const data = Buffer.from(text)
  const prefix = Buffer.alloc(bytes)
  prefix.writeUIntBE(data.length, 0, bytes)
  return [prefix, data]
}

function dateBytes(date) {
  const out = Buffer.alloc(8)
  out.writeBigUInt64BE(BigInt(date))
  return out
}

// What a message's signature covers: the board, the sender, the date, the
// name and the text.
function signablePayload(boardKey, { author, date, name, text }) {
  return Buffer.concat([
    MESSAGE_CONTEXT,
    boardKey,
    Buffer.from(author, 'hex'),
    dateBytes(date),
    ...lengthPrefixed(name, 1),
    ...lengthPrefixed(text, 2),
  ])
}

function sign(payload, secretKey) {
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, payload, secretKey)
  return signature
}

function verify(payload, signatureHex, publicKey) {
  return sodium.crypto_sign_verify_detached(Buffer.from(signatureHex, 'hex'), payload, publicKey)
}

// A message's id: the same on every device, from what was signed and the
// signature. What moderation hides and what peers compare when syncing.
function messageId(message) {
  return hash([Buffer.from(message.sig, 'hex')], 16).toString('hex')
}

// A new message from this device. `keyPair` is the sender's key for this
// board. Throws on a name or text that isn't allowed, with the reason as its
// code.
function createMessage({ boardKey, date = Date.now(), keyPair, name = '', text }) {
  const problem = nameProblem(name) ?? messageTextProblem(text)
  if (problem) throw Object.assign(new Error(`The message can't be sent: ${problem}`), { code: problem })
  const message = { author: keyPair.publicKey.toString('hex'), date, name, text, v: 1 }
  return { ...message, sig: sign(signablePayload(boardKey, message), keyPair.secretKey).toString('hex') }
}

// Why a message from another device can't be accepted, or null. Checks only
// the message itself; who's blocked and the rate limit depend on the board
// (board-store.cjs, board-sync.cjs).
function messageProblem(boardKey, message, { now = Date.now() } = {}) {
  if (!message || typeof message !== 'object' || message.v !== 1) return 'invalid'
  const { author, date, name, sig, text } = message
  if (typeof author !== 'string' || !HEX_KEY.test(author)) return 'invalid'
  if (typeof sig !== 'string' || !HEX_SIGNATURE.test(sig)) return 'invalid'
  if (!Number.isSafeInteger(date) || date < 0) return 'invalid'
  const problem = nameProblem(name) ?? messageTextProblem(text)
  if (problem) return problem
  if (date > now + MAX_CLOCK_AHEAD_MS) return 'future'
  if (!verify(signablePayload(boardKey, message), sig, Buffer.from(author, 'hex'))) return 'signature'
  return null
}

// Only what a message is made of, so nothing extra a sender added travels on
// or is stored.
function cleanMessage({ author, date, name, sig, text }) {
  return { author, date, name, sig, text, v: 1 }
}

// The moderation list in its canonical form: sorted and without duplicates.
function normalizeModeration({ blocked = [], hidden = [], on = false, seq, studentLimitBytes = DEFAULT_STUDENT_LIMIT_BYTES }) {
  return {
    blocked: [...new Set(blocked)].sort(),
    hidden: [...new Set(hidden)].sort(),
    on: Boolean(on),
    seq,
    studentLimitBytes,
    v: 1,
  }
}

function moderationPayload(boardKey, list) {
  const body = JSON.stringify([list.seq, list.on, list.studentLimitBytes, list.hidden, list.blocked])
  return Buffer.concat([MODERATION_CONTEXT, boardKey, Buffer.from(body)])
}

// A moderation list signed by the course's key pair (the teacher's device).
// `seq` orders lists: a device keeps the highest it has seen.
function createModeration({ boardKey, keyPair, list, teacherKey }) {
  if (!keyPair.publicKey.equals(teacherKey)) throw new Error("Only the course's own key signs its moderation list")
  const normalized = normalizeModeration(list)
  const problem = moderationShapeProblem(normalized)
  if (problem) throw Object.assign(new Error(`The moderation list isn't valid: ${problem}`), { code: problem })
  return { ...normalized, sig: sign(moderationPayload(boardKey, normalized), keyPair.secretKey).toString('hex') }
}

function moderationShapeProblem(list) {
  if (!Number.isSafeInteger(list.seq) || list.seq < 0) return 'invalid'
  if (typeof list.on !== 'boolean') return 'invalid'
  if (
    !Number.isSafeInteger(list.studentLimitBytes) ||
    list.studentLimitBytes < MIN_STUDENT_LIMIT_BYTES ||
    list.studentLimitBytes > MAX_STUDENT_LIMIT_BYTES
  ) {
    return 'limit'
  }
  if (!Array.isArray(list.hidden) || list.hidden.length > MAX_HIDDEN) return 'too-long'
  if (!Array.isArray(list.blocked) || list.blocked.length > MAX_BLOCKED) return 'too-long'
  if (!list.hidden.every((id) => typeof id === 'string' && HEX_ID.test(id))) return 'invalid'
  if (!list.blocked.every((key) => typeof key === 'string' && HEX_KEY.test(key))) return 'invalid'
  return null
}

// A moderation list from another device, cleaned and checked, or null when
// it isn't one signed by the course's key.
function verifiedModeration(boardKey, teacherKey, list) {
  if (!list || typeof list !== 'object' || list.v !== 1) return null
  if (typeof list.sig !== 'string' || !HEX_SIGNATURE.test(list.sig)) return null
  if (!Array.isArray(list.hidden) || !Array.isArray(list.blocked)) return null
  const normalized = normalizeModeration(list)
  // Signed lists are always canonical; one that isn't was changed on the way.
  if (normalized.hidden.length !== list.hidden.length || normalized.blocked.length !== list.blocked.length) return null
  if (moderationShapeProblem(normalized)) return null
  if (!verify(moderationPayload(boardKey, normalized), list.sig, teacherKey)) return null
  return { ...normalized, sig: list.sig }
}

module.exports = {
  DEFAULT_STUDENT_LIMIT_BYTES,
  MAX_BLOCKED,
  MAX_CLOCK_AHEAD_MS,
  MAX_HIDDEN,
  MAX_NAME_GRAPHEMES,
  MAX_STUDENT_LIMIT_BYTES,
  MAX_TEXT_BYTES,
  MAX_TEXT_GRAPHEMES,
  MIN_STUDENT_LIMIT_BYTES,
  RATE_LIMIT_COUNT,
  RATE_LIMIT_WINDOW_MS,
  cleanMessage,
  countGraphemes,
  createMessage,
  createModeration,
  messageId,
  messageProblem,
  verifiedModeration,
}
