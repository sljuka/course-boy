// Course activity events (SLJ-168): what a student's device tells the
// course's teacher, without saying who: "imported", "started", "finished
// a section", "reached the end", "finished the course".
//
// - **One key per event.** The student's worker derives a separate key for
//   each event from its store and the course's id (`activity/<course
//   id>/<event id>`), so one student's events can't be linked into a path,
//   and the same event always has the same key: a resend is a duplicate and
//   each key counts once.
// - **Sealed for the course's key.** What happened (the kind, attempt,
//   section, band, course version) is encrypted for the key that signs the
//   course's drive (the `teacherKey`, as for board moderation), so students
//   who pass an event on can't read it. Visible: the event's key, its day
//   and the signature.
// - **Signed for the board,** like messages, so an event can't be replayed
//   on another course's board.
//
// Records travel as JSON (keys and signatures in hex, the sealed box in
// base64). Every check here is pure, so it's the same on every device and
// covered by activity-events.test.mjs.

const sodium = require('sodium-native')

const EVENT_CONTEXT = Buffer.from('matko-activity-event/1')

const DAY_MS = 24 * 60 * 60_000
// Days since 1970 from 2022 on: anything earlier is made up.
const MIN_DAY = 18_993
// A sealed box at most this large (a payload is well under 200 bytes).
const MAX_BOX_BYTES = 512
// Per-attempt events are sent for the first this many attempts only ("5 or
// more").
const MAX_ATTEMPTS = 5

const KINDS = new Set(['end', 'finished', 'imported', 'section', 'started'])
const PER_ATTEMPT = new Set(['end', 'finished', 'section'])
// How much of the course was done on reaching its end: bands, not a
// percentage, so one event isn't a fingerprint (main works it out:
// src/lib/course-activity.ts).
const BANDS = ['under-25', '25-49', '50-74', '75-99', 'all']

const HEX_KEY = /^[0-9a-f]{64}$/
const HEX_SIGNATURE = /^[0-9a-f]{128}$/
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

function dayOf(date) {
  return Math.floor(date / DAY_MS)
}

// Why a payload (what's sealed) isn't one, or null.
function payloadProblem(payload) {
  if (!payload || typeof payload !== 'object') return 'invalid'
  const { attempt, band, kind, section, version } = payload
  if (!KINDS.has(kind)) return 'invalid'
  if (version !== undefined && (typeof version !== 'string' || version.length > 32)) return 'invalid'
  if (PER_ATTEMPT.has(kind)) {
    if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_ATTEMPTS) return 'invalid'
  } else if (attempt !== undefined) {
    return 'invalid'
  }
  if (kind === 'section' ? typeof section !== 'string' || section === '' || section.length > 128 : section !== undefined) {
    return 'invalid'
  }
  if (kind === 'end' ? !BANDS.includes(band) : band !== undefined) return 'invalid'
  return null
}

// Only what a payload is made of.
function cleanPayload({ attempt, band, kind, section, version }) {
  return {
    kind,
    ...(attempt !== undefined ? { attempt } : {}),
    ...(band !== undefined ? { band } : {}),
    ...(section !== undefined ? { section } : {}),
    ...(version !== undefined ? { version } : {}),
  }
}

function signablePayload(boardKey, { box, day, key }) {
  const dayBytes = Buffer.alloc(4)
  dayBytes.writeUInt32BE(day)
  return Buffer.concat([EVENT_CONTEXT, boardKey, Buffer.from(key, 'hex'), dayBytes, Buffer.from(box, 'base64')])
}

function curvePublicKey(edPublicKey) {
  const out = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  sodium.crypto_sign_ed25519_pk_to_curve25519(out, edPublicKey)
  return out
}

function curveSecretKey(edSecretKey) {
  const out = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_sign_ed25519_sk_to_curve25519(out, edSecretKey)
  return out
}

// A new event from this device. `keyPair`: the event's own key (derived per
// event); `teacherKey`: the key it's sealed for; `day`: when it happened, in
// days since 1970. Throws on a payload that isn't one.
function createActivityEvent({ boardKey, day, keyPair, payload, teacherKey }) {
  if (payloadProblem(payload)) throw Object.assign(new Error("The activity event isn't valid"), { code: 'invalid' })
  const plain = Buffer.from(JSON.stringify(cleanPayload(payload)))
  const sealed = Buffer.alloc(plain.length + sodium.crypto_box_SEALBYTES)
  sodium.crypto_box_seal(sealed, plain, curvePublicKey(teacherKey))
  const event = { box: sealed.toString('base64'), day, key: keyPair.publicKey.toString('hex'), v: 1 }
  const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, signablePayload(boardKey, event), keyPair.secretKey)
  return { ...event, sig: signature.toString('hex') }
}

// Why an event from another device can't be accepted, or null. `now`: the
// receiver's clock; an event dated after tomorrow is refused.
function activityEventProblem(boardKey, event, { now = Date.now() } = {}) {
  if (!event || typeof event !== 'object' || event.v !== 1) return 'invalid'
  const { box, day, key, sig } = event
  if (typeof key !== 'string' || !HEX_KEY.test(key)) return 'invalid'
  if (typeof sig !== 'string' || !HEX_SIGNATURE.test(sig)) return 'invalid'
  if (typeof box !== 'string' || !BASE64.test(box) || box.length > Math.ceil(MAX_BOX_BYTES / 3) * 4) return 'invalid'
  if (!Number.isSafeInteger(day) || day < MIN_DAY) return 'invalid'
  if (day > dayOf(now) + 1) return 'future'
  const signature = Buffer.from(sig, 'hex')
  if (!sodium.crypto_sign_verify_detached(signature, signablePayload(boardKey, event), Buffer.from(key, 'hex'))) {
    return 'signature'
  }
  return null
}

// Only what an event is made of, so nothing extra travels on or is stored.
function cleanActivityEvent({ box, day, key, sig }) {
  return { box, day, key, sig, v: 1 }
}

// What a checked event says, on the teacher's device (`courseKeyPair`: the
// key it was sealed for), or null when it can't be opened or isn't valid.
function openActivityEvent(event, courseKeyPair) {
  const sealed = Buffer.from(event.box, 'base64')
  if (sealed.length <= sodium.crypto_box_SEALBYTES) return null
  const plain = Buffer.alloc(sealed.length - sodium.crypto_box_SEALBYTES)
  const opened = sodium.crypto_box_seal_open(
    plain,
    sealed,
    curvePublicKey(courseKeyPair.publicKey),
    curveSecretKey(courseKeyPair.secretKey),
  )
  if (!opened) return null
  try {
    const payload = JSON.parse(plain.toString())
    return payloadProblem(payload) ? null : cleanPayload(payload)
  } catch {
    return null
  }
}

module.exports = {
  BANDS,
  DAY_MS,
  MAX_ATTEMPTS,
  activityEventProblem,
  cleanActivityEvent,
  createActivityEvent,
  dayOf,
  openActivityEvent,
  payloadProblem,
}
