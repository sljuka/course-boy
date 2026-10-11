// Maintainers of a shared course talking to each other (SLJ-11).
//
// Each maintainer has a *mailbox* per course: a small drive of their own
// (mailboxKeyPair, from their identity and the course's public id) that the
// other maintainers' apps follow. What a maintainer writes there:
//
//   /members.json                 the owner only: who maintains the course and
//                                 how many must approve a version
//   /proposal.json                a version proposed for approval (the latest)
//   /approvals/<hash>.json        an approval: the signed response to the
//                                 proposal whose request has that hash
//   /changes-requested/<hash>.json  "ask for changes", with a note
//
// Inviting (SLJ-67): an invite is for one publisher. The owner's app makes a
// blind-pairing invite tied to the publisher id the owner entered (one code to
// send: the course's public id, then the invite). The invited maintainer's app
// answers with their publisher id, maintainer key and mailbox, **signed with
// the key behind that publisher id** (derived from their identity), so the
// owner's app knows the keys are theirs. Anyone else using the code is refused,
// and the code works once (the same publisher may retry) and for a week. The
// owner's app confirms with its own mailbox's key; each then follows the
// other's mailbox.
//
// No Electron or Bare specifics, so vitest runs it (maintainers.test.mjs).

const BlindPairing = require('blind-pairing')
const Hyperdrive = require('hyperdrive')
const IdEncoding = require('hypercore-id-encoding')
const crypto = require('hypercore-crypto')
const z32 = require('z32')
const { creatorKeyPair, mailboxKeyPair } = require('./identity-keys.cjs')
const { maintainerPublicKey, openWritableDrive } = require('./shared-course.cjs')

const PUBLIC_ID_PATTERN = /^[a-z2-7]{16}$/
const MAX_FILE_BYTES = 256 * 1024
// Reading another maintainer's mailbox waits this long for its data: a
// mailbox whose owner is offline mustn't hold everything up. What arrives
// later is read on the next change.
const READ_TIMEOUT_MS = 10_000
// Opening our own mailbox on a computer that doesn't have it yet (a restored
// identity): how long to look for its existing history before writing.
const SYNC_TIMEOUT_MS = 15_000
// Joining with an invite: if the owner isn't found within one attempt, look
// again from scratch (a missed lookup isn't retried by the swarm for a long
// while), this many times.
const JOIN_ATTEMPT_MS = 10_000
const JOIN_ATTEMPTS = 6
// How long an invite code works.
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
// What a joining maintainer signs: who they are, for which invite and course.
const JOIN_SIGNATURE_CONTEXT = Buffer.from('matko-maintainer-join')

class MaintainersError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// `context`: { store, swarm, pairing (BlindPairing on swarm), identity()
// (the unlocked identity), onJoined({ publicId, member }) (an invited
// maintainer answered), onMailboxChanged(key) }.
function createMaintainers(context) {
  const mailboxes = new Map() // publicId -> our writable mailbox drive
  const followed = new Map() // hex key -> others' mailbox drive
  const members = new Map() // publicId -> blind-pairing member (inviting)
  const invites = new Map() // hex invite id -> { publicId, publicKey }: each code we made

  function identity() {
    const key = context.identity()
    if (!key) throw new MaintainersError('LOCKED', 'The publishing identity is locked')
    return key
  }

  function publisherId() {
    return IdEncoding.normalize(creatorKeyPair(identity()).publicKey)
  }

  // Our mailbox for the course: writable, and announced so the others find it.
  async function openMailbox(publicId) {
    assertPublicId(publicId)
    const existing = mailboxes.get(publicId)
    if (existing) return existing

    const drive = await openWritableDrive(context.store, mailboxKeyPair(identity(), publicId))
    context.swarm.join(drive.discoveryKey, { client: true, server: true })
    mailboxes.set(publicId, drive)
    return drive
  }

  // Before our first write to a mailbox this device has nothing of: its key
  // comes from the identity, so on a new computer (a restored identity) it's
  // the same mailbox, without its history. Writing then would fork it:
  // whoever holds the old history would see two different mailboxes under one
  // key, which Hypercore treats as fatal. So its history is fetched first
  // from whoever has it (the other maintainers follow it). A truly new
  // mailbox costs one lookup: nobody is found, and nothing is waited for.
  //
  // It also runs when the mailbox *knows* entries it doesn't hold: joining its
  // topic, a new computer learns the old mailbox's length from a peer at once,
  // without the entries. Writing on top of that, then losing the peer, leaves
  // a mailbox nobody can read in full.
  const synced = new Set()
  async function syncBeforeWriting(publicId) {
    if (synced.has(publicId)) return
    let drive = mailboxes.get(publicId)
    if (drive.core.length > 0 && drive.core.contiguousLength < drive.core.length) {
      await withTimeout(drive.core.download({ start: 0, end: drive.core.length }).done(), SYNC_TIMEOUT_MS).catch(() => {})
      await downloadBlobs(drive)
    }
    drive = mailboxes.get(publicId)
    if (drive.core.length === 0) {
      await withTimeout(context.swarm.flush(), SYNC_TIMEOUT_MS).catch(() => {})
      if (drive.core.peers.length > 0) {
        const key = drive.key
        mailboxes.delete(publicId)
        await drive.close()
        const reader = new Hyperdrive(context.store.session(), key)
        try {
          await reader.ready()
          await withTimeout(reader.core.update({ wait: true }), SYNC_TIMEOUT_MS).catch(() => {})
          if (reader.core.length > 0) {
            await withTimeout(reader.core.download({ start: 0, end: reader.core.length }).done(), SYNC_TIMEOUT_MS)
            await downloadBlobs(reader)
          }
        } finally {
          await reader.close()
        }
        await openMailbox(publicId)
      }
    }
    synced.add(publicId)
  }

  // What we tell the others about ourselves for the course.
  async function self(publicId) {
    const mailbox = await openMailbox(publicId)
    return {
      mailboxKey: IdEncoding.normalize(mailbox.key),
      maintainerKey: maintainerPublicKey(identity(), publicId),
      publisherId: publisherId(),
    }
  }

  async function writeMailbox(publicId, file, value) {
    await openMailbox(publicId)
    await syncBeforeWriting(publicId)
    const mailbox = await openMailbox(publicId)
    await mailbox.put(file, Buffer.from(JSON.stringify(value, null, 2)))
  }

  // Another maintainer's mailbox: followed (kept and announced), and reported
  // when it changes.
  async function followMailbox(key) {
    const hex = IdEncoding.decode(key).toString('hex')
    const existing = followed.get(hex)
    if (existing) return existing

    const drive = new Hyperdrive(context.store.session(), IdEncoding.decode(key))
    await drive.ready()
    context.swarm.join(drive.discoveryKey, { client: true, server: true })
    drive.core.on('append', () => context.onMailboxChanged?.(IdEncoding.normalize(drive.key)))
    // A full copy, kept up to date (mailboxes are tiny): any maintainer can
    // then give a mailbox's whole history to its owner's new computer.
    drive.core.download({ start: 0, end: -1 })
    drive.getBlobs().then((blobs) => blobs.core.download({ start: 0, end: -1 }), () => {})
    followed.set(hex, drive)
    return drive
  }

  // Everything a mailbox says (ours or someone else's), as plain data. Bounded
  // as a whole: a read whose data never arrives (some steps inside Hyperdrive
  // don't honour a per-call timeout) comes back empty instead of blocking
  // every later read of the course; the next refresh tries again.
  async function readMailbox(key, options) {
    const empty = { approvals: {}, changesRequested: {}, members: null, proposal: null }
    return withTimeout(readMailboxUnbounded(key, options), READ_TIMEOUT_MS * 2).catch(() => empty)
  }

  async function readMailboxUnbounded(key, { wait = false } = {}) {
    const drive = (await ownMailboxByKey(key)) ?? (await followMailbox(key))
    if (wait) await drive.core.update({ wait: true }).catch(() => {})
    else await drive.core.update().catch(() => {})

    const readJson = async (file) => {
      try {
        return await withTimeout(
          (async () => {
            const entry = await drive.entry(file, { timeout: READ_TIMEOUT_MS })
            if (!entry || (entry.value.blob?.byteLength ?? 0) > MAX_FILE_BYTES) return null
            return JSON.parse(await drive.get(file, { timeout: READ_TIMEOUT_MS }))
          })(),
          READ_TIMEOUT_MS,
        )
      } catch {
        return null
      }
    }
    const readFolder = async (folder) => {
      const out = {}
      const list = async () => {
        for await (const entry of drive.list(folder)) {
          const name = entry.key.slice(folder.length + 1).replace(/\.json$/, '')
          const value = await readJson(entry.key)
          if (value) out[name] = value
        }
      }
      await withTimeout(list(), READ_TIMEOUT_MS).catch(() => {})
      return out
    }

    return {
      approvals: await readFolder('/approvals'),
      changesRequested: await readFolder('/changes-requested'),
      members: await readJson('/members.json'),
      proposal: await readJson('/proposal.json'),
    }
  }

  async function ownMailboxByKey(key) {
    const hex = IdEncoding.decode(key).toString('hex')
    for (const drive of mailboxes.values()) {
      if (drive.key.toString('hex') === hex) return drive
    }
    return null
  }

  // The owner: a code that lets one person join as a maintainer. Their answer
  // arrives through `context.onJoined`.
  // `invitee`: the publisher id of the one person this invite is for.
  async function createInvite(publicId, invitee) {
    let inviteePublicKey
    try {
      inviteePublicKey = IdEncoding.decode(invitee)
    } catch {
      throw new MaintainersError('INVALID_PUBLISHER', "That isn't a publisher id")
    }
    const mailbox = await openMailbox(publicId)
    const expires = Date.now() + INVITE_LIFETIME_MS
    const { id, invite, publicKey } = BlindPairing.createInvite(mailbox.key, { expires })
    invites.set(id.toString('hex'), { expires, inviteePublicKey, publicId, publicKey, usedBy: null })

    if (!members.has(publicId)) {
      const member = context.pairing.addMember({
        discoveryKey: mailbox.discoveryKey,
        onadd: (request) => {
          // Each request names the invite it uses: one of ours for this course.
          const record = invites.get(request.inviteId.toString('hex'))
          if (!record || record.publicId !== publicId) {
            request.deny({ status: 1 })
            return
          }
          request.open(record.publicKey)
          if (Date.now() > record.expires) {
            request.deny({ status: 3 }) // expired
            return
          }
          // Only the invited publisher, proven by their signature; once (the
          // same publisher may come again, e.g. after a timed-out attempt).
          const joined = parseMember(request.userData)
          if (!joined || !verifyJoin(joined, request.inviteId, publicId, record.inviteePublicKey)) {
            request.deny({ status: 1 })
            return
          }
          if (record.usedBy && record.usedBy !== joined.publisherId) {
            request.deny({ status: 2 }) // already used
            return
          }
          record.usedBy = joined.publisherId
          request.confirm({ key: mailbox.key })
          void followMailbox(joined.mailboxKey).catch(() => {})
          const { signature: _signature, ...member } = joined
          context.onJoined?.({ member, publicId })
        },
      })
      members.set(publicId, member)
    }
    // The code is handed out only once we can be found by it: someone who
    // looks before our announcement is out finds nobody, and isn't told to
    // look again for a long while.
    await context.swarm.flush()
    // The code: the course's public id (16 characters), then the invite.
    return z32.encode(Buffer.concat([Buffer.from(publicId, 'ascii'), invite]))
  }

  // The invited maintainer: joins with the code. Returns the course's public
  // id and the owner's mailbox key (followed from now on).
  async function acceptInvite(code) {
    let invite
    let publicId
    let inviteId
    try {
      const bytes = z32.decode(code.trim())
      publicId = bytes.subarray(0, 16).toString('ascii')
      invite = bytes.subarray(16)
      assertPublicId(publicId)
      inviteId = BlindPairing.decodeInvite(invite).id
    } catch {
      throw new MaintainersError('INVALID_INVITE', "This isn't a maintainer invite")
    }

    // Who we are, signed with the key behind our publisher id.
    const me = await self(publicId)
    const creator = creatorKeyPair(identity())
    let signature
    try {
      signature = crypto.sign(joinMessage(inviteId, publicId, me), creator.secretKey)
    } finally {
      creator.secretKey.fill(0)
    }
    const userData = Buffer.from(JSON.stringify({ ...me, signature: signature.toString('hex') }))
    let result = null
    for (let attempt = 0; attempt < JOIN_ATTEMPTS && !result; attempt++) {
      const candidate = context.pairing.addCandidate({ invite, onadd: () => {}, userData })
      try {
        result = await withTimeout(
          new Promise((resolve, reject) => {
            candidate.request.once('rejected', reject)
            candidate.pairing.then(resolve, reject)
          }),
          JOIN_ATTEMPT_MS,
        )
      } catch (error) {
        // Refused (for someone else, already used, or expired): don't keep trying.
        if (error?.message !== 'Timed out') {
          throw new MaintainersError('INVITE_REFUSED', "This invite can't be used: it's for someone else, already used, or expired")
        }
      } finally {
        await candidate.close()
      }
    }
    if (!result) throw new MaintainersError('NOT_FOUND', "The person who sent this invite isn't online")

    const ownerMailboxKey = IdEncoding.normalize(result.key)
    await followMailbox(ownerMailboxKey)
    return { ownerMailboxKey, publicId }
  }

  async function close() {
    for (const member of members.values()) await member.close().catch(() => {})
    for (const drive of [...mailboxes.values(), ...followed.values()]) await drive.close().catch(() => {})
    members.clear()
    mailboxes.clear()
    followed.clear()
  }

  return { acceptInvite, close, createInvite, followMailbox, openMailbox, readMailbox, self, writeMailbox }
}

// All of a drive's file data, as far as it's known now.
async function downloadBlobs(drive) {
  try {
    const blobs = (await withTimeout(drive.getBlobs(), READ_TIMEOUT_MS)).core
    await withTimeout(blobs.download({ start: 0, end: blobs.length }).done(), SYNC_TIMEOUT_MS)
  } catch {
    // Read later, on demand.
  }
}

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Timed out')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

function assertPublicId(publicId) {
  if (typeof publicId !== 'string' || !PUBLIC_ID_PATTERN.test(publicId)) {
    throw new MaintainersError('INVALID_COURSE', 'Invalid course')
  }
}

// What an invited maintainer sends: three keys, nothing else.
function parseMember(userData) {
  try {
    const data = JSON.parse(Buffer.from(userData).toString())
    return {
      mailboxKey: IdEncoding.normalize(data.mailboxKey),
      maintainerKey: IdEncoding.normalize(data.maintainerKey),
      publisherId: IdEncoding.normalize(data.publisherId),
      signature: typeof data.signature === 'string' ? Buffer.from(data.signature, 'hex') : null,
    }
  } catch {
    return null
  }
}

// What a joining maintainer signs (with the key behind their publisher id):
// the invite they use, the course, and the keys they bring.
function joinMessage(inviteId, publicId, member) {
  return crypto.hash([
    JOIN_SIGNATURE_CONTEXT,
    Buffer.from(inviteId),
    Buffer.from(publicId, 'ascii'),
    IdEncoding.decode(member.publisherId),
    IdEncoding.decode(member.maintainerKey),
    IdEncoding.decode(member.mailboxKey),
  ])
}

// The joiner is the invited publisher, and signed for these keys.
function verifyJoin(member, inviteId, publicId, inviteePublicKey) {
  if (!member.signature || member.signature.length !== 64) return false
  if (!IdEncoding.decode(member.publisherId).equals(inviteePublicKey)) return false
  return crypto.verify(joinMessage(inviteId, publicId, member), member.signature, inviteePublicKey)
}

// The hash a request is filed under in the mailboxes.
function requestHash(request) {
  return crypto.hash(z32.decode(request)).toString('hex')
}

module.exports = { MaintainersError, createMaintainers, requestHash }
