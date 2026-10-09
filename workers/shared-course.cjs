// Courses shared by several publishers (SLJ-11): a version goes online only
// when enough maintainers approve it ("signers" + "quorum", always more than
// half, so two different versions can never both be approved).
//
// The shared course is a Hyperdrive whose cores are signed by the
// maintainers' keys together (Hypercore manifests with several signers, via
// hyper-multisig). Its code comes from those keys, the quorum and the
// course's original public id alone, so every maintainer works it out the
// same.
//
// Publishing a version:
// 1. The proposer puts it into a *proposal* drive of their own: a fresh drive
//    whose history starts with a verbatim copy of the shared course's blocks,
//    with the version's files written on top. The shared course's history
//    must be an exact beginning of what's signed, so a proposal can't be
//    built any other way. A signing request names the proposal's tree at its
//    new length, bound to the shared course's key.
// 2. Each approver opens the proposal by its key, checks that it builds on
//    the shared course's latest version (the same tree up to its length),
//    reviews it, and signs the request with their maintainer key.
// 3. With enough signatures, anyone holding the proposal commits it: its new
//    blocks are copied into the shared course with the combined signature.
//
// No Electron or Bare specifics here, so it runs in vitest
// (workers/shared-course.test.mjs) as well as in the worker.

const Hyperdrive = require('hyperdrive')
const Hyperbee = require('hyperbee')
const Localdrive = require('localdrive')
const HyperMultisig = require('hyper-multisig')
const SignRequest = require('hypercore-signing-request')
const crypto = require('hypercore-crypto')
const IdEncoding = require('hypercore-id-encoding')
const z32 = require('z32')
const { maintainerKeyPair, proposalKeyPair } = require('./identity-keys.cjs')

const DRIVE_DB_OPTIONS = { keyEncoding: 'utf-8', valueEncoding: 'json', metadata: { contentFeed: null } }
const SOURCE_FILE_KEY = '/source.json'

class SharedCourseError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// The signers in one agreed order (the code depends on it), as z32 keys.
function canonicalSigners(publicKeys) {
  return [...new Set(publicKeys.map((key) => IdEncoding.normalize(key)))].sort()
}

// More than half: any two groups that can approve share a member.
function assertMajority(signers, quorum) {
  if (!Number.isInteger(quorum) || quorum <= signers.length / 2 || quorum > signers.length) {
    throw new SharedCourseError('INVALID_QUORUM', `A version needs more than half of ${signers.length} maintainers, not ${quorum}`)
  }
}

function namespaceFor(publicId) {
  return `matko-shared-course-${publicId}`
}

// The shared course's identity: its signers, quorum and original public id.
function sharedCourseSpec({ publicId, quorum, signers }) {
  const ordered = canonicalSigners(signers)
  assertMajority(ordered, quorum)
  return { namespace: namespaceFor(publicId), publicId, quorum, signers: ordered }
}

// This maintainer's key for the course, as a z32 string (what goes into the
// signers list).
function maintainerPublicKey(identity, publicId) {
  return IdEncoding.normalize(maintainerKeyPair(identity, publicId).publicKey)
}

function sharedCourseKey(spec) {
  return HyperMultisig.getCoreKey(spec.signers, spec.namespace, { quorum: spec.quorum })
}

// The shared course's drive, read-only (nobody holds its key alone).
async function openSharedDrive(store, spec) {
  const multisig = new HyperMultisig(store, null)
  const { blobsCore, core, key } = await multisig.createDrive(spec.signers, spec.namespace, { quorum: spec.quorum })
  await Promise.all([core.ready(), blobsCore.ready()])
  const drive = new Hyperdrive(store.session(), key)
  await drive.ready()
  await Promise.all([core.close(), blobsCore.close()])
  return drive
}

// Copies the shared course's blocks, as they are, to the start of an empty
// core of ours.
async function copyBlocks(from, to, length) {
  if (to.length > 0) throw new SharedCourseError('PROPOSAL_NOT_EMPTY', 'This proposal drive was used before')
  if (length === 0) return
  await from.download({ start: 0, end: length }).done()
  for (let index = 0; index < length; index++) {
    await to.append(await from.get(index))
  }
}

// Step 1: a version proposed for the shared course. `versionPath` holds the
// version's files; `source` is the source.json to put next to them (it names
// the shared course's drive, since this content becomes it). `index` numbers
// this maintainer's proposals for the course, so each gets a fresh drive.
// Returns the proposal drive (kept open, to be seeded and committed) and the
// signing request (z32).
async function createProposal({ identity, index, source, spec, store, versionPath }) {
  // The shared course's two cores, as this store has them (empty before its
  // first version: a Hyperdrive would wait for data that isn't there yet).
  const multisig = new HyperMultisig(store, null)
  const shared = await multisig.createDrive(spec.signers, spec.namespace, { quorum: spec.quorum })
  await Promise.all([shared.core.ready(), shared.blobsCore.ready()])
  const keyPair = proposalKeyPair(identity, spec.publicId, index)

  // The cores are created by their public key only, so the store never keeps
  // the secret (SLJ-55); writing goes through sessions with the key pair.
  const dbManifest = { signers: [{ publicKey: keyPair.publicKey }], version: store.manifestVersion }
  const db = store.get({ manifest: dbManifest })
  await db.ready()
  const dbKey = db.key
  const blobsManifest = Hyperdrive.getContentManifest(db.manifest, db.key)
  const blobs = store.get({ manifest: blobsManifest })
  await blobs.ready()

  try {
    const dbWriter = store.get({ exclusive: true, key: db.key, keyPair })
    const blobsWriter = store.get({ exclusive: true, key: blobs.key, keyPair })
    try {
      await copyBlocks(shared.core, dbWriter, shared.core.length)
      await copyBlocks(shared.blobsCore, blobsWriter, shared.blobsCore.length)
    } finally {
      await Promise.all([dbWriter.close(), blobsWriter.close()])
    }
  } finally {
    await Promise.all([db.close(), blobs.close(), shared.core.close(), shared.blobsCore.close()])
  }

  const drive = await openWritableDrive(store, keyPair)

  await mirrorInto(versionPath, drive)
  await drive.put(SOURCE_FILE_KEY, Buffer.from(JSON.stringify(source, null, 2)))

  const request = await SignRequest.generateDrive(drive, { manifest: shared.manifest })

  return { drive, length: drive.core.length, request: z32.encode(request) }
}

// A drive of ours, writable with `keyPair` through a session: the cores are
// created by their public key only, so the store never keeps the secret
// (SLJ-55).
async function openWritableDrive(store, keyPair) {
  const dbManifest = { signers: [{ publicKey: keyPair.publicKey }], version: store.manifestVersion }
  const db = store.get({ manifest: dbManifest })
  await db.ready()
  const blobs = store.get({ manifest: Hyperdrive.getContentManifest(db.manifest, db.key) })
  await blobs.ready()
  const dbKey = db.key
  await Promise.all([db.close(), blobs.close()])

  const drive = new Hyperdrive(store.session(), {
    _db: new Hyperbee(store.get({ exclusive: true, key: dbKey, keyPair }), DRIVE_DB_OPTIONS),
  })
  await drive.ready()
  return drive
}

// Makes `drive` hold exactly the files under `versionPath` (source.json is
// written separately).
async function mirrorInto(versionPath, drive) {
  const local = new Localdrive(versionPath)
  await local.mirror(drive, { prune: false }).done()
  for await (const entry of drive.list('/')) {
    if (entry.key === SOURCE_FILE_KEY) continue
    if (!(await local.entry(entry.key))) await drive.del(entry.key)
  }
}

// Step 2 (an approver): opens the proposal named by the request, after
// checking that it's for this shared course, is what the request describes,
// and continues the course's latest version exactly. Returns the proposal
// drive and what it changes, for review. `proposalKey`: the proposal drive's
// key (sent along with the request).
//
// Downloads almost nothing: the proposal's beginning is checked against the
// shared course by Merkle tree hashes (Hypercore fetches only the block at
// that length and its proof), so the copied part, unchanged files included,
// is never downloaded. Unchanged files point into that verified part; only
// files whose data lies past it are new, and only those need fetching to
// review them (a 2 GB course with one edited lesson costs about that lesson
// and the file index).
async function openProposalForReview({ proposalKey, request, spec, store }) {
  const decoded = decodeRequest(request)
  if (!decoded.key.equals(sharedCourseKey(spec))) {
    throw new SharedCourseError('WRONG_COURSE', 'This request is not for this course')
  }

  // The shared course's cores only (their lengths and trees): opening a
  // second Hyperdrive on it, next to the one the worker seeds, would never
  // become ready.
  const multisig = new HyperMultisig(store, null)
  const shared = await multisig.createDrive(spec.signers, spec.namespace, { quorum: spec.quorum })
  await Promise.all([shared.core.ready(), shared.blobsCore.ready()])
  const proposal = new Hyperdrive(store.session(), IdEncoding.decode(proposalKey))
  try {
    await proposal.ready()
    await proposal.core.update({ wait: true })
    await Promise.all([shared.core.update().catch(() => {}), shared.blobsCore.update().catch(() => {})])
    const proposalBlobs = (await proposal.getBlobs()).core

    const contentLength = decoded.content?.length ?? 0
    const describesIt =
      (await proposal.core.treeHash(decoded.length)).equals(decoded.treeHash) &&
      (contentLength === 0 || (await proposalBlobs.treeHash(contentLength)).equals(decoded.content.treeHash))
    if (!describesIt) {
      throw new SharedCourseError('PROPOSAL_MISMATCH', 'The proposal is not what the request describes')
    }

    // It must continue the course exactly as it is now: longer, and the same
    // up to the course's length, for the file index and the file data.
    const sharedLength = shared.core.length
    const sharedBlobsLength = shared.blobsCore.length
    const samePrefix = async (core, sharedCore, length) =>
      length === 0 || (await core.treeHash(length)).equals(await sharedCore.treeHash(length))
    const buildsOnLatest =
      decoded.length > sharedLength &&
      contentLength >= sharedBlobsLength &&
      (await samePrefix(proposal.core, shared.core, sharedLength)) &&
      (await samePrefix(proposalBlobs, shared.blobsCore, sharedBlobsLength))
    if (!buildsOnLatest) {
      throw new SharedCourseError('NOT_LATEST', "This version doesn't build on the course's latest version")
    }

    const changes = await listChanges(proposal, decoded.length, sharedLength, sharedBlobsLength)
    return { changes, length: decoded.length, proposal, sharedLength }
  } catch (error) {
    await proposal.close()
    throw error
  } finally {
    await Promise.all([shared.core.close(), shared.blobsCore.close()])
  }
}

// What the proposal (at `length`) changes in the shared course (the
// proposal's own history at `sharedLength`, already proven the same): files
// added, changed (their data lies past the shared course's blobs) or removed.
// Reads the file index only.
async function listChanges(proposal, length, sharedLength, sharedBlobsLength) {
  const next = proposal.checkout(length)
  const previous = sharedLength > 0 ? proposal.checkout(sharedLength) : null
  const changes = []
  try {
    const before = new Map()
    if (previous) {
      for await (const entry of previous.list('/')) before.set(entry.key, entry)
    }
    for await (const entry of next.list('/')) {
      if (entry.key === SOURCE_FILE_KEY) continue
      const old = before.get(entry.key)
      before.delete(entry.key)
      const blob = entry.value.blob
      const isNewData = Boolean(blob) && blob.blockOffset + blob.blockLength > sharedBlobsLength
      if (!old) changes.push({ kind: 'added', path: entry.key })
      else if (isNewData || Boolean(blob) !== Boolean(old.value.blob)) changes.push({ kind: 'changed', path: entry.key })
    }
    for (const key of before.keys()) {
      if (key !== SOURCE_FILE_KEY) changes.push({ kind: 'removed', path: key })
    }
  } finally {
    await next.close()
    if (previous) await previous.close()
  }
  return changes.sort((left, right) => left.path.localeCompare(right.path))
}

function decodeRequest(request) {
  try {
    return SignRequest.decode(z32.decode(request))
  } catch (error) {
    throw new SharedCourseError('INVALID_REQUEST', `Invalid signing request: ${error.message}`)
  }
}

// Step 2, signing: this maintainer's approval of the request (z32), for the
// shared course's main core and its blobs.
function signRequest({ identity, publicId, request }) {
  const requestBuffer = z32.decode(request)
  const decoded = decodeRequest(request)
  const keyPair = maintainerKeyPair(identity, publicId)
  try {
    const signatures = SignRequest.signable(keyPair.publicKey, decoded).map(({ signable }) =>
      crypto.sign(signable, keyPair.secretKey),
    )
    return z32.encode(
      SignRequest.encodeResponse({
        publicKey: keyPair.publicKey,
        requestHash: crypto.hash(requestBuffer),
        signatures,
        version: decoded.version,
      }),
    )
  } finally {
    keyPair.secretKey.fill(0)
  }
}

// Step 3: puts the proposal online as the shared course's next version, with
// the approvals (z32 responses). Fails when there aren't enough, or when it
// no longer builds on the course's latest version. `first`: the course's
// first version (nothing to compare it with yet).
async function commitProposal({ first = false, proposal, request, responses, spec, store }) {
  const multisig = new HyperMultisig(store, nullSwarm)
  return multisig
    .commitDrive(spec.signers, spec.namespace, proposal, request, responses, {
      // Our own app seeds the course; its fork checks stay on.
      minFullCopies: 0,
      minPeers: 0,
      peerUpdateTimeout: 0,
      quorum: spec.quorum,
      skipTargetChecks: first,
    })
    .done()
}

// The course moved (it's now the shared course `sharedKey`): its old drive's
// source.json says so, keeping everything else it said. Students' apps that
// follow the old drive read it and follow the shared course from then on, and
// an import from the old code goes there directly (course-source.cjs:
// movedToKey). `drive` is the old, writable drive.
async function writeMovedNotice(drive, sharedKey) {
  const current = await drive.get(SOURCE_FILE_KEY)
  const source = current ? JSON.parse(current) : { driveKey: IdEncoding.normalize(drive.key) }
  const next = { ...source, movedTo: { driveKey: IdEncoding.normalize(sharedKey) } }
  await drive.put(SOURCE_FILE_KEY, Buffer.from(JSON.stringify(next, null, 2)))
}

// hyper-multisig joins topics on the swarm it's given; the worker announces
// the drives itself, so a no-op stands in.
const nullSwarm = { join: () => ({ flushed: () => Promise.resolve(), destroy: () => Promise.resolve() }) }

module.exports = {
  SharedCourseError,
  canonicalSigners,
  commitProposal,
  createProposal,
  maintainerPublicKey,
  openProposalForReview,
  openWritableDrive,
  openSharedDrive,
  sharedCourseKey,
  sharedCourseSpec,
  signRequest,
  writeMovedNotice,
}
