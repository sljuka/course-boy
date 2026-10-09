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
// Inviting: the owner's app makes a blind-pairing invite (one code to send:
// the course's public id, then the invite). The invited maintainer's app answers with
// their publisher id, maintainer key and mailbox; the owner's app confirms
// with its own mailbox's key. Each then follows the other's mailbox. Nothing
// secret is exchanged: the invite code is what lets someone in, so it's sent
// to one person, privately.
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
    followed.set(hex, drive)
    return drive
  }

  // Everything a mailbox says (ours or someone else's), as plain data.
  async function readMailbox(key, { wait = false } = {}) {
    const drive = (await ownMailboxByKey(key)) ?? (await followMailbox(key))
    if (wait) await drive.core.update({ wait: true }).catch(() => {})
    else await drive.core.update().catch(() => {})

    const readJson = async (file) => {
      try {
        const entry = await drive.entry(file, { timeout: READ_TIMEOUT_MS })
        if (!entry || (entry.value.blob?.byteLength ?? 0) > MAX_FILE_BYTES) return null
        return JSON.parse(await drive.get(file, { timeout: READ_TIMEOUT_MS }))
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
  async function createInvite(publicId) {
    const mailbox = await openMailbox(publicId)
    const { id, invite, publicKey } = BlindPairing.createInvite(mailbox.key)
    invites.set(id.toString('hex'), { publicId, publicKey })

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
          const joined = parseMember(request.userData)
          if (!joined) {
            request.deny({ status: 1 })
            return
          }
          request.confirm({ key: mailbox.key })
          void followMailbox(joined.mailboxKey).catch(() => {})
          context.onJoined?.({ member: joined, publicId })
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
    try {
      const bytes = z32.decode(code.trim())
      publicId = bytes.subarray(0, 16).toString('ascii')
      invite = bytes.subarray(16)
      assertPublicId(publicId)
      BlindPairing.decodeInvite(invite)
    } catch {
      throw new MaintainersError('INVALID_INVITE', "This isn't a maintainer invite")
    }

    const userData = Buffer.from(JSON.stringify(await self(publicId)))
    const candidate = context.pairing.addCandidate({ invite, onadd: () => {}, userData })
    let result
    try {
      result = await new Promise((resolve, reject) => {
        candidate.request.once('rejected', reject)
        candidate.pairing.then(resolve, reject)
      })
    } finally {
      await candidate.close()
    }

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
    }
  } catch {
    return null
  }
}

// The hash a request is filed under in the mailboxes.
function requestHash(request) {
  return crypto.hash(z32.decode(request)).toString('hex')
}

module.exports = { MaintainersError, createMaintainers, requestHash }
