import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import BlindPairing from 'blind-pairing'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import createTestnet from 'hyperdht/testnet.js'
import IdEncoding from 'hypercore-id-encoding'
import { createMaintainers, requestHash } from './maintainers.cjs'
import {
  commitProposal,
  createProposal,
  openProposalForReview,
  openSharedDrive,
  sharedCourseKey,
  sharedCourseSpec,
  signRequest,
} from './shared-course.cjs'

// SLJ-11, milestone 3: two maintainers' apps, each with its own store, swarm
// and blind-pairing, on a local DHT testnet.
const PUBLIC_ID = 'mmmmaintainersaa'
let root
let testnet
const peers = []

async function makePeer(name) {
  const store = new Corestore(path.join(root, name))
  const swarm = new Hyperswarm({ bootstrap: testnet.bootstrap })
  swarm.on('connection', (connection) => store.replicate(connection))
  const pairing = new BlindPairing(swarm)
  const identity = crypto.randomBytes(32)
  const events = { joined: [], changed: [] }
  const maintainers = createMaintainers({
    identity: () => identity,
    onJoined: (event) => events.joined.push(event),
    onMailboxChanged: (key) => events.changed.push(key),
    pairing,
    store,
    swarm,
  })
  const peer = { events, identity, maintainers, pairing, store, swarm }
  peers.push(peer)
  return peer
}

async function until(check, timeout = 20_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = await check()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Timed out')
}

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'matko-maintainers-'))
  testnet = await createTestnet(3)
})

afterAll(async () => {
  for (const peer of peers) {
    await peer.maintainers.close()
    await peer.pairing.close().catch(() => {})
    await peer.swarm.destroy().catch(() => {})
    await peer.store.close().catch(() => {})
  }
  await testnet?.destroy()
  fs.rmSync(root, { force: true, recursive: true })
})

describe('maintainers (SLJ-11)', () => {
  let ana
  let marko
  let anaSelf
  let markoSelf

  it('Ana invites Marko with one code; each learns the other and follows their mailbox', async () => {
    ana = await makePeer('ana')
    marko = await makePeer('marko')
    anaSelf = await ana.maintainers.self(PUBLIC_ID)

    // An earlier code doesn't get in the way of a newer one.
    await ana.maintainers.createInvite(PUBLIC_ID)
    const code = await ana.maintainers.createInvite(PUBLIC_ID)
    const accepted = await marko.maintainers.acceptInvite(code)
    markoSelf = await marko.maintainers.self(PUBLIC_ID)

    expect(accepted).toEqual({ ownerMailboxKey: anaSelf.mailboxKey, publicId: PUBLIC_ID })
    const joined = await until(() => ana.events.joined[0])
    expect(joined).toEqual({ member: markoSelf, publicId: PUBLIC_ID })

    // The owner writes who maintains the course and the rule; Marko reads it.
    await ana.maintainers.writeMailbox(PUBLIC_ID, '/members.json', {
      members: [anaSelf, markoSelf],
      publicId: PUBLIC_ID,
      quorum: 2,
    })
    const members = await until(async () => (await marko.maintainers.readMailbox(anaSelf.mailboxKey)).members)
    expect(members.quorum).toBe(2)
    expect(members.members.map((member) => member.publisherId)).toEqual([anaSelf.publisherId, markoSelf.publisherId])
  }, 60_000)

  it('rejects a code that is not a maintainer invite', async () => {
    await expect(marko.maintainers.acceptInvite('not-a-code')).rejects.toMatchObject({ code: 'INVALID_INVITE' })
  })

  it('a proposal and its approval travel through the mailboxes, and the version goes online', async () => {
    const spec = sharedCourseSpec({ publicId: PUBLIC_ID, quorum: 2, signers: [anaSelf.maintainerKey, markoSelf.maintainerKey] })
    const versionPath = fs.mkdtempSync(path.join(root, 'version-'))
    fs.writeFileSync(path.join(versionPath, 'course.json'), JSON.stringify({ id: 'course-x', version: '0.2' }))

    // Ana proposes, and says so in her mailbox.
    const { drive: proposal, request } = await createProposal({
      identity: ana.identity,
      index: 0,
      source: { driveKey: IdEncoding.normalize(sharedCourseKey(spec)), publicId: PUBLIC_ID },
      spec,
      store: ana.store,
      versionPath,
    })
    ana.swarm.join(proposal.discoveryKey, { client: true, server: true })
    await ana.maintainers.writeMailbox(PUBLIC_ID, '/proposal.json', {
      proposalKey: IdEncoding.normalize(proposal.key),
      request,
      version: '0.2',
    })

    // Marko's app sees it, reviews it, and answers in his mailbox.
    const seen = await until(async () => (await marko.maintainers.readMailbox(anaSelf.mailboxKey)).proposal)
    const review = await openProposalForReview({ proposalKey: seen.proposalKey, request: seen.request, spec, store: marko.store })
    expect(review.changes).toEqual([{ kind: 'added', path: '/course.json' }])
    await review.proposal.close()
    await marko.maintainers.writeMailbox(PUBLIC_ID, `/approvals/${requestHash(seen.request)}.json`, {
      response: signRequest({ identity: marko.identity, publicId: PUBLIC_ID, request: seen.request }),
    })

    // Ana's app collects it and commits.
    const approval = await until(
      async () => (await ana.maintainers.readMailbox(markoSelf.mailboxKey)).approvals[requestHash(request)],
    )
    await commitProposal({
      first: true,
      proposal,
      request,
      responses: [signRequest({ identity: ana.identity, publicId: PUBLIC_ID, request }), approval.response],
      spec,
      store: ana.store,
    })
    const shared = await openSharedDrive(ana.store, spec)
    expect(JSON.parse(await shared.get('/course.json')).version).toBe('0.2')
    await Promise.all([shared.close(), proposal.close()])
  }, 60_000)
})

