import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import Hyperswarm from 'hyperswarm'
import createTestnet from 'hyperdht/testnet.js'
import IdEncoding from 'hypercore-id-encoding'
import {
  commitProposal,
  createProposal,
  maintainerPublicKey,
  openProposalForReview,
  openSharedDrive,
  proposalState,
  sharedCourseKey,
  sharedCourseSpec,
  signRequest,
  writeMovedNotice,
} from './shared-course.cjs'
import { movedToKey, unchangedFileKeys } from './course-source.cjs'
import Localdrive from 'localdrive'

// SLJ-11, milestone 1: two maintainers and a student, each with their own
// store and swarm, on a local DHT testnet (never the public network).
const PUBLIC_ID = 'abcdefghijklmn23'
let root
let testnet
const peers = {}

async function makePeer(name) {
  const store = new Corestore(path.join(root, name))
  const swarm = new Hyperswarm({ bootstrap: testnet.bootstrap })
  swarm.on('connection', (connection) => store.replicate(connection))
  peers[name] = { identity: crypto.randomBytes(32), store, swarm }
  return peers[name]
}

async function announce(peer, drive) {
  await peer.swarm.join(drive.discoveryKey, { client: true, server: true }).flushed()
}

async function find(peer, drive) {
  peer.swarm.join(drive.discoveryKey, { client: true, server: true })
  await peer.swarm.flush()
}

function versionFolder(files) {
  const dir = fs.mkdtempSync(path.join(root, 'version-'))
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), content)
  }
  return dir
}

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-shared-course-'))
  testnet = await createTestnet(3)
})

afterAll(async () => {
  for (const peer of Object.values(peers)) {
    await peer.swarm.destroy().catch(() => {})
    await peer.store.close().catch(() => {})
  }
  await testnet?.destroy()
  fs.rmSync(root, { force: true, recursive: true })
})

describe('shared courses (multisig)', () => {
  let ana
  let marko
  let student
  let spec
  const asset = crypto.randomBytes(150_000)

  it('both maintainers derive the same code from their keys and the rule', async () => {
    ana = await makePeer('ana')
    marko = await makePeer('marko')
    student = await makePeer('student')
    const signers = [maintainerPublicKey(ana.identity, PUBLIC_ID), maintainerPublicKey(marko.identity, PUBLIC_ID)]

    spec = sharedCourseSpec({ publicId: PUBLIC_ID, quorum: 2, signers })
    const markoSpec = sharedCourseSpec({ publicId: PUBLIC_ID, quorum: 2, signers: [...signers].reverse() })
    expect(sharedCourseKey(markoSpec).equals(sharedCourseKey(spec))).toBe(true)
    // Half isn't enough: two halves could approve two different versions.
    expect(() => sharedCourseSpec({ publicId: PUBLIC_ID, quorum: 1, signers })).toThrow(/more than half/)
  })

  it('Ana proposes the first version, Marko reviews and approves it, and it goes online', async () => {
    const versionPath = versionFolder({
      'assets/pic.bin': asset,
      'course.json': JSON.stringify({ id: 'course-a', version: '0.2' }),
      'section/lessons/1.md': '# Lesson one',
    })
    const source = { driveKey: IdEncoding.normalize(sharedCourseKey(spec)), publicId: PUBLIC_ID }
    const { drive: proposal, request } = await createProposal({
      identity: ana.identity,
      index: 0,
      source,
      spec,
      store: ana.store,
      versionPath,
    })
    await announce(ana, proposal)

    // Marko opens it by its key, reviews it, and signs.
    await find(marko, proposal)
    const review = await openProposalForReview({
      proposalKey: IdEncoding.normalize(proposal.key),
      request,
      spec,
      store: marko.store,
    })
    expect((await review.proposal.get('/section/lessons/1.md')).toString()).toBe('# Lesson one')
    await review.proposal.close()
    const markoApproval = signRequest({ identity: marko.identity, publicId: PUBLIC_ID, request })
    const anaApproval = signRequest({ identity: ana.identity, publicId: PUBLIC_ID, request })

    // One approval of two is refused.
    await expect(
      commitProposal({ first: true, proposal, request, responses: [anaApproval], spec, store: ana.store }),
    ).rejects.toThrow(/Insufficient quorum/)

    await commitProposal({ first: true, proposal, request, responses: [anaApproval, markoApproval], spec, store: ana.store })
    const shared = await openSharedDrive(ana.store, spec)
    await announce(ana, shared)

    // A student follows the shared course by its code alone.
    const followed = new Hyperdrive(student.store.session(), sharedCourseKey(spec))
    await followed.ready()
    await find(student, followed)
    await followed.core.update({ wait: true })
    expect(JSON.parse(await followed.get('/course.json')).version).toBe('0.2')
    expect((await followed.get('/assets/pic.bin')).equals(asset)).toBe(true)
    expect(JSON.parse(await followed.get('/source.json')).driveKey).toBe(source.driveKey)
    expect(followed.core.manifest.quorum).toBe(2)
    await followed.close()
  }, 60_000)

  it('Marko proposes the next version on top, Ana approves, and Marko commits it', async () => {
    // Marko has the shared course (replicated from Ana).
    const markoShared = await openSharedDrive(marko.store, spec)
    await find(marko, markoShared)
    await markoShared.core.update({ wait: true })
    await markoShared.close()

    const versionPath = versionFolder({
      'assets/pic.bin': asset,
      'course.json': JSON.stringify({ id: 'course-a', version: '0.3' }),
      'section/lessons/1.md': '# Lesson one, fixed',
    })
    const source = { driveKey: IdEncoding.normalize(sharedCourseKey(spec)), publicId: PUBLIC_ID }
    const { drive: proposal, request } = await createProposal({
      identity: marko.identity,
      index: 0,
      source,
      spec,
      store: marko.store,
      versionPath,
    })
    await announce(marko, proposal)

    await find(ana, proposal)
    const review = await openProposalForReview({
      proposalKey: IdEncoding.normalize(proposal.key),
      request,
      spec,
      store: ana.store,
    })
    expect(review.sharedLength).toBeGreaterThan(0)
    // Only the edited lesson and course.json changed; the asset didn't.
    expect(review.changes).toEqual([
      { kind: 'changed', path: '/course.json' },
      { kind: 'changed', path: '/section/lessons/1.md' },
    ])
    // Reviewing it downloaded none of the asset: its blocks lie in the part
    // copied from the shared course, proven the same by tree hashes.
    const blobs = (await review.proposal.getBlobs()).core
    const assetEntry = await review.proposal.entry('/assets/pic.bin')
    const { blockOffset, blockLength } = assetEntry.value.blob
    for (let index = blockOffset; index < blockOffset + blockLength; index++) {
      expect(await blobs.has(index)).toBe(false)
    }
    // The changed lesson can be read for review (fetched on demand).
    expect((await review.proposal.get('/section/lessons/1.md')).toString()).toBe('# Lesson one, fixed')
    await review.proposal.close()

    // A rival version Ana proposed on the same version (only course.json
    // changed, so its history is shorter than Marko's).
    const rival = await createProposal({
      identity: ana.identity,
      index: 2,
      source,
      spec,
      store: ana.store,
      versionPath: versionFolder({
        'assets/pic.bin': asset,
        'course.json': JSON.stringify({ id: 'course-a', version: '0.3' }),
        'section/lessons/1.md': '# Lesson one',
      }),
    })
    await rival.drive.close()
    expect(await proposalState({ request, spec, store: marko.store })).toBe('waiting')
    expect(await proposalState({ request: rival.request, spec, store: marko.store })).toBe('waiting')

    await commitProposal({
      proposal,
      request,
      responses: [
        signRequest({ identity: ana.identity, publicId: PUBLIC_ID, request }),
        signRequest({ identity: marko.identity, publicId: PUBLIC_ID, request }),
      ],
      spec,
      store: marko.store,
    })

    const followed = new Hyperdrive(student.store.session(), sharedCourseKey(spec))
    await followed.ready()
    await find(student, followed)
    const deadline = Date.now() + 20_000
    while (JSON.parse(await followed.get('/course.json')).version !== '0.3' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      await followed.core.update().catch(() => {})
    }
    expect((await followed.get('/section/lessons/1.md')).toString()).toBe('# Lesson one, fixed')
    await followed.close()

    // SLJ-109: Marko's is online, and the rival lost its spot, read from the
    // requests and the shared course alone.
    expect(await proposalState({ request, spec, store: marko.store })).toBe('online')
    expect(await proposalState({ request: rival.request, spec, store: marko.store })).toBe('replaced')
  }, 60_000)

  it("refuses to review a proposal that doesn't build on the course's latest version", async () => {
    // Ana's proposal number 1 was made before Marko's version landed for her:
    // she builds it on a store that never saw Marko's version.
    const stale = await makePeer('stale-ana')
    stale.identity = ana.identity
    const versionPath = versionFolder({ 'course.json': JSON.stringify({ id: 'course-a', version: '9.9' }) })
    const { drive: proposal, request } = await createProposal({
      identity: ana.identity,
      index: 1,
      source: {},
      spec,
      store: stale.store,
      versionPath,
    })
    await announce(stale, proposal)

    await find(marko, proposal)
    await expect(
      openProposalForReview({ proposalKey: IdEncoding.normalize(proposal.key), request, spec, store: marko.store }),
    ).rejects.toMatchObject({ code: 'NOT_LATEST' })
  }, 60_000)
})

// SLJ-11, milestone 2: a published course moves to a shared one (here 1 of 1,
// the owner alone, the first step before inviting anyone).
describe('moving a course', () => {
  it("the old drive points to the shared course, and the student's update from it skips unchanged files", async () => {
    const teacher = await makePeer('move-teacher')
    const pupil = await makePeer('move-student')
    const movePublicId = 'movemovemovemove'
    const asset = crypto.randomBytes(200_000)
    const hash = (data) => crypto.createHash('sha256').update(data).digest('hex')
    const v1 = {
      'assets/big.bin': asset,
      'course.json': JSON.stringify({ id: 'course-m', version: '0.2' }),
      'lesson.md': '# One',
    }
    const withMeta = (files) => ({
      ...files,
      'version-meta.json': JSON.stringify({ cutAt: '', fileHashes: Object.fromEntries(Object.entries(files).map(([file, data]) => [file, hash(data)])) }),
    })

    // The course as published today: a drive of the teacher's own.
    const old = new Hyperdrive(teacher.store.namespace('old-course'))
    await old.ready()
    await new Localdrive(versionFolder(withMeta(v1))).mirror(old).done()
    await old.put('/source.json', Buffer.from(JSON.stringify({ driveKey: IdEncoding.normalize(old.key) })))
    await announce(teacher, old)

    // The student has version 0.2 installed (a local copy) and follows the old drive.
    const installed = versionFolder(withMeta(v1))
    const followedOld = new Hyperdrive(pupil.store.session(), old.key)
    await followedOld.ready()
    await find(pupil, followedOld)
    await followedOld.core.update({ wait: true })

    // The teacher moves it: the shared course gets version 0.3 (one lesson
    // edited), then the old drive says where it went.
    const moveSpec = sharedCourseSpec({ publicId: movePublicId, quorum: 1, signers: [maintainerPublicKey(teacher.identity, movePublicId)] })
    const v2 = { ...v1, 'course.json': JSON.stringify({ id: 'course-m', version: '0.3' }), 'lesson.md': '# One, edited' }
    const sharedKey = sharedCourseKey(moveSpec)
    const { drive: proposal, request } = await createProposal({
      identity: teacher.identity,
      index: 0,
      source: { driveKey: IdEncoding.normalize(sharedKey), publicId: movePublicId },
      spec: moveSpec,
      store: teacher.store,
      versionPath: versionFolder(withMeta(v2)),
    })
    await commitProposal({
      first: true,
      proposal,
      request,
      responses: [signRequest({ identity: teacher.identity, publicId: movePublicId, request })],
      spec: moveSpec,
      store: teacher.store,
    })
    const shared = await openSharedDrive(teacher.store, moveSpec)
    await announce(teacher, shared)
    await writeMovedNotice(old, sharedKey)

    // The student's app reads the notice on the old drive.
    const deadline = Date.now() + 20_000
    let moved = null
    while (!moved && Date.now() < deadline) {
      await followedOld.core.update().catch(() => {})
      const text = await followedOld.get('/source.json')
      moved = text ? movedToKey(text.toString(), followedOld.key) : null
      if (!moved) await new Promise((resolve) => setTimeout(resolve, 200))
    }
    expect(moved).toBe(IdEncoding.normalize(sharedKey))

    // Its update from the shared course, as the worker applies it: files with
    // the same hash in both version-meta.json are left alone.
    const followedShared = new Hyperdrive(pupil.store.session(), IdEncoding.decode(moved))
    await followedShared.ready()
    await find(pupil, followedShared)
    await followedShared.core.update({ wait: true })
    const unchanged = unchangedFileKeys(
      (await followedShared.get('/version-meta.json')).toString(),
      fs.readFileSync(path.join(installed, 'version-meta.json'), 'utf8'),
    )
    expect([...unchanged]).toEqual(['/assets/big.bin'])
    await followedShared.mirror(new Localdrive(installed, { atomic: true }), { filter: (key) => !unchanged.has(key) }).done()

    expect(fs.readFileSync(path.join(installed, 'lesson.md'), 'utf8')).toBe('# One, edited')
    expect(fs.readFileSync(path.join(installed, 'assets/big.bin')).equals(asset)).toBe(true)
    // None of the asset's blocks came over the network.
    const blobs = (await followedShared.getBlobs()).core
    const { blockOffset, blockLength } = (await followedShared.entry('/assets/big.bin')).value.blob
    for (let index = blockOffset; index < blockOffset + blockLength; index++) {
      expect(await blobs.has(index)).toBe(false)
    }
    await Promise.all([followedOld.close(), followedShared.close(), proposal.close(), shared.close(), old.close()])
  }, 60_000)
})
