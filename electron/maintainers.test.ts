import { describe, expect, it, vi } from 'vitest'

import { createMaintainers, notesSince, type MaintainersService, type MaintainersState } from './maintainers'

// A fake of what the worker does (mailboxes, the shared course), shared by
// two maintainers' services, so the decisions are tested without a network.
type Mailbox = {
  approvals: Record<string, { response?: unknown; spot?: unknown }>
  changesRequested: Record<string, { note?: unknown }>
  members: unknown
  proposal: unknown
}

type Self = { mailboxKey: string; maintainerKey: string; publisherId: string }

type World = {
  commits: { first: boolean; request: string; responses: string[] }[]
  mailboxes: Map<string, Mailbox>
  moved: string[]
  // Whose invite is being accepted.
  owner: { self: Self; service: MaintainersService } | null
  // request -> the shared course's length once it's committed
  lengths: Map<string, number>
  shared: { length: number; source: unknown; version: string | null }
  sources: Map<string, unknown> // request -> its source.json
  versions: Map<string, string> // request -> version
}

function createWorld(): World {
  return {
    commits: [],
    lengths: new Map(),
    mailboxes: new Map(),
    moved: [],
    owner: null,
    shared: { length: 0, source: null, version: null },
    sources: new Map(),
    versions: new Map(),
  }
}

function createPeer(world: World, name: string, { courseId = null as string | null, publishedVersion = '0.2' } = {}) {
  const self = { mailboxKey: `mb-${name}`, maintainerKey: `mk-${name}`, publisherId: `pub-${name}` }
  let state: MaintainersState = { courses: {} }
  let proposals = 0
  const published = { version: publishedVersion }
  const mailbox = () => {
    if (!world.mailboxes.has(self.mailboxKey)) {
      world.mailboxes.set(self.mailboxKey, { approvals: {}, changesRequested: {}, members: null, proposal: null })
    }
    return world.mailboxes.get(self.mailboxKey)!
  }

  const op = vi.fn(async (name_: string, args: Record<string, unknown>): Promise<unknown> => {
    switch (name_) {
      case 'self':
        return self
      case 'createInvite':
        world.owner = peer
        return { code: `invite-${args.publicId}` }
      case 'acceptInvite': {
        const owner = world.owner!
        await owner.service.onJoined({ member: self, publicId: 'pubid0000000000a' })
        return { ownerMailboxKey: owner.self.mailboxKey, publicId: 'pubid0000000000a' }
      }
      case 'writeMailbox': {
        const box = mailbox()
        const file = args.file as string
        if (file === '/members.json') box.members = args.value
        else if (file === '/proposal.json') box.proposal = args.value
        else if (file.startsWith('/approvals/')) box.approvals[file.slice(11, -5)] = args.value as { response: unknown }
        else if (file.startsWith('/changes-requested/')) box.changesRequested[file.slice(19, -5)] = args.value as { note: unknown }
        return {}
      }
      case 'readMailbox':
        return world.mailboxes.get(args.key as string) ?? { approvals: {}, changesRequested: {}, members: null, proposal: null }
      case 'followMailbox':
      case 'dropProposal':
        return {}
      case 'seedShared':
        return { courseId: world.shared.version ? 'course-1' : null, sharedKey: 'shared-key', version: world.shared.version }
      case 'propose': {
        const request = `req-${name}-${proposals++}`
        world.versions.set(request, published.version)
        world.sources.set(request, args.source)
        world.lengths.set(request, world.shared.length + 1)
        return { hash: `h-${request}`, length: world.shared.length + 1, proposalKey: `prop-${request}`, request }
      }
      case 'sign':
        return { response: `sig-${self.maintainerKey}-${args.request}` }
      case 'proposalState': {
        const request = args.request as string
        if (world.commits.some((commit) => commit.request === request)) return { state: 'online' }
        return { state: world.shared.length >= (world.lengths.get(request) ?? Infinity) ? 'replaced' : 'waiting' }
      }
      case 'review':
        return {
          changelog: [{ changes: [], cutAt: '', notes: 'Fixed a typo', version: '0.2' }],
          changes: [{ kind: 'changed', path: '/lesson.md' }],
          length: world.shared.length + 1,
          sharedLength: world.shared.length,
        }
      case 'commit':
        world.commits.push({ first: args.first as boolean, request: args.request as string, responses: args.responses as string[] })
        world.shared = {
          length: world.shared.length + 1,
          source: world.sources.get(args.request as string),
          version: world.versions.get(args.request as string)!,
        }
        return { sharedKey: 'shared-key' }
      case 'moveNotice':
        world.moved.push(args.courseId as string)
        return {}
      case 'readSharedSource':
        return { courseId: 'course-1', source: world.shared.source, title: 'Fractions', version: world.shared.version }
      case 'downloadShared':
        return { courseId: 'course-1', version: world.shared.version }
      default:
        throw new Error(`unexpected op ${name_}`)
    }
  })

  const landCourse = vi.fn(async (_input: unknown) => {})
  const onShared = vi.fn()
  let landed = courseId !== null
  const service = createMaintainers({
    courseOnDevice: async () => landed,
    createStagingPath: async () => '/staging',
    landCourse: async (input) => {
      landed = true
      await landCourse(input)
    },
    onShared,
    op: op as never,
    publishedCourse: async () => ({
      code: 'old-code',
      publicId: 'pubid0000000000a',
      version: published.version,
      versionPath: '/versions/x',
    }),
    seedOldCode: async () => {},
    removeStaging: async () => {},
    setInterval: () => ({ cancel: () => {} }),
    createPreviewPath: async (hash: string) => `/previews/${hash}`,
    store: { read: () => state, write: (next) => (state = next) },
  })
  const peer = { landCourse, onShared, op, published, self, service, state: () => state }
  return peer
}

describe('maintainers (SLJ-11)', () => {
  it('invites a maintainer, gets both approvals for the first version, moves the course, and lands it for the maintainer', async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')

    expect(await ana.service.invite('course-1', 'pub-marko')).toEqual({ code: 'invite-pubid0000000000a' })
    await marko.service.accept('invite-pubid0000000000a')
    // Accepting reads the owner's mailbox in the background: wait for it.
    await marko.service.refresh('pubid0000000000a')

    // The owner wrote both members; the maintainer read them.
    expect(marko.state().courses.pubid0000000000a).toMatchObject({ role: 'maintainer' })
    expect(marko.state().courses.pubid0000000000a.members.map((member) => member.publisherId)).toEqual(['pub-ana', 'pub-marko'])

    // The first shared version: proposed (and approved by Ana herself).
    const proposal = await ana.service.startSharing('course-1', 2)
    expect(proposal).toMatchObject({ first: true, version: '0.2' })
    await marko.service.refresh('pubid0000000000a')
    expect(marko.service.listApprovals()).toEqual({
      items: [
        {
          approvedBy: ['pub-ana'],
          changesRequested: [],
          courseId: null,
          decidedAt: null,
          from: 'pub-ana',
          group: 'waiting-for-you',
          hash: proposal.hash,
          mine: false,
          missing: ['pub-marko'],
          proposedAt: expect.any(Number),
          publicId: 'pubid0000000000a',
          quorum: 2,
          title: null,
          version: '0.2',
        },
      ],
      maintained: 1,
    })
    expect(await marko.service.review('pubid0000000000a', proposal.hash)).toMatchObject({
      releaseNotes: [{ notes: 'Fixed a typo', version: '0.2' }],
      version: '0.2',
    })

    // One approval isn't enough: nothing is committed yet.
    await ana.service.refresh('pubid0000000000a')
    expect(world.commits).toEqual([])

    await marko.service.approve('pubid0000000000a', proposal.hash)
    // It waits for nobody else, but isn't online yet: Ana's app commits it.
    expect(marko.service.listApprovals().items).toMatchObject([{ approvedBy: ['pub-ana', 'pub-marko'], group: 'waiting-for-others' }])
    await expect(marko.service.approve('pubid0000000000a', proposal.hash)).rejects.toMatchObject({ code: 'ANSWERED' })
    await ana.service.refresh('pubid0000000000a')
    expect(ana.service.listApprovals().items).toMatchObject([{ decidedAt: expect.any(Number), group: 'approved', mine: true }])

    expect(world.commits).toEqual([
      { first: true, request: proposal.request, responses: [`sig-mk-ana-${proposal.request}`, `sig-mk-marko-${proposal.request}`] },
    ])
    expect(world.moved).toEqual(['course-1'])
    expect(ana.onShared).toHaveBeenCalledWith('course-1')
    expect(ana.service.isShared('course-1')).toBe(true)

    // Marko's app lands the shared course as his own.
    await marko.service.refresh('pubid0000000000a')
    expect(marko.landCourse).toHaveBeenCalledWith({ courseId: 'course-1', stagingPath: '/staging', version: '0.2' })
    expect(marko.service.isShared('course-1')).toBe(true)
    expect(marko.onShared).toHaveBeenCalledWith('course-1')
    expect(marko.service.listApprovals().items).toMatchObject([{ courseId: 'course-1', group: 'approved', missing: [] }])
  })

  it("a maintainer's Publish becomes a proposal; the owner approves; it goes online", async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    // Accepting reads the owner's mailbox in the background: wait for it.
    await marko.service.refresh('pubid0000000000a')
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)
    await ana.service.refresh('pubid0000000000a')
    await marko.service.refresh('pubid0000000000a')

    // Marko publishes 0.3.
    marko.published.version = '0.3'
    expect(await marko.service.publishShared('course-1')).toBe('shared-key')
    // Publishing again (e.g. at startup) doesn't propose it twice.
    await marko.service.publishShared('course-1')
    expect(marko.op.mock.calls.filter(([name]) => name === 'propose')).toHaveLength(1)

    await ana.service.refresh('pubid0000000000a')
    const waiting = ana.service.listApprovals().items.find((item) => item.group === 'waiting-for-you')!
    expect(waiting).toMatchObject({ courseId: 'course-1', from: 'pub-marko', version: '0.3' })
    await ana.service.approve('pubid0000000000a', waiting.hash)
    await marko.service.refresh('pubid0000000000a')

    expect(world.commits.at(-1)).toMatchObject({ first: false })
    expect(world.shared.version).toBe('0.3')
  })

  // SLJ-109: three maintainers, two must approve.
  async function threeMaintainers() {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    const mila = createPeer(world, 'mila')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    await ana.service.invite('course-1', 'pub-mila')
    await mila.service.accept('invite-pubid0000000000a')
    await marko.service.refresh('pubid0000000000a')
    await mila.service.refresh('pubid0000000000a')
    return { ana, marko, mila, world }
  }

  it("a version approved without the third maintainer leaves their 'waiting for you' for Approved", async () => {
    const { ana, marko, mila } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    await mila.service.refresh('pubid0000000000a')
    expect(mila.service.listApprovals().items).toMatchObject([
      { group: 'waiting-for-you', missing: ['pub-marko', 'pub-mila'], quorum: 2 },
    ])

    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)
    await ana.service.refresh('pubid0000000000a')

    // Online without Mila: her app sees it in the shared course.
    await mila.service.refresh('pubid0000000000a')
    expect(mila.service.listApprovals().items).toMatchObject([
      { approvedBy: ['pub-ana', 'pub-marko'], group: 'approved', hash: first.hash },
    ])
    await expect(mila.service.approve('pubid0000000000a', first.hash)).rejects.toMatchObject({ code: 'NO_PROPOSAL' })
  })

  it('a version that lost its spot to another is Replaced; asking for changes groups it under Changes requested', async () => {
    const { ana, marko, mila } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    for (const peer of [marko, mila]) {
      await peer.service.refresh('pubid0000000000a')
      await peer.service.approve('pubid0000000000a', first.hash)
    }
    await ana.service.refresh('pubid0000000000a')
    await marko.service.refresh('pubid0000000000a')
    await mila.service.refresh('pubid0000000000a')

    // Ana and Marko both propose a next version, for the same spot.
    ana.published.version = '0.3'
    marko.published.version = '0.4'
    await ana.service.publishShared('course-1')
    await marko.service.publishShared('course-1')
    await mila.service.refresh('pubid0000000000a')
    const waiting = mila.service.listApprovals().items.filter((item) => item.group === 'waiting-for-you')
    expect(waiting.map((item) => item.version).sort()).toEqual(['0.3', '0.4'])
    const anas = waiting.find((item) => item.version === '0.3')!
    const markos = waiting.find((item) => item.version === '0.4')!

    // Mila asks Ana for changes, and approves Marko's: it goes online.
    await mila.service.requestChanges('pubid0000000000a', anas.hash, 'Shorter, please')
    expect(mila.service.listApprovals().items.find((item) => item.hash === anas.hash)).toMatchObject({
      changesRequested: [{ note: 'Shorter, please', publisherId: 'pub-mila' }],
      group: 'changes-requested',
    })
    await mila.service.approve('pubid0000000000a', markos.hash)
    await marko.service.refresh('pubid0000000000a')

    for (const peer of [ana, mila]) {
      await peer.service.refresh('pubid0000000000a')
      const items = peer.service.listApprovals().items
      expect(items.find((item) => item.hash === markos.hash)).toMatchObject({ group: 'approved' })
      expect(items.find((item) => item.hash === anas.hash)).toMatchObject({ group: 'replaced', missing: [] })
    }
  })

  // A maintainer's new computer (SLJ-54) still never approves a second
  // version for a spot they approved one for on the old computer.
  async function restoredAfterApproving({ dropSpot }: { dropSpot: boolean }) {
    const { ana, marko, mila, world } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)
    for (const peer of [ana, marko, mila]) await peer.service.refresh('pubid0000000000a')

    // Ana proposes 0.3; Mila approves it on her old computer. Not committed
    // yet (Ana's app hasn't read it).
    ana.published.version = '0.3'
    await ana.service.publishShared('course-1')
    await mila.service.refresh('pubid0000000000a')
    const anas = mila.service.listApprovals().items.find((item) => item.version === '0.3')!
    await mila.service.approve('pubid0000000000a', anas.hash)
    expect(world.mailboxes.get('mb-mila')!.approvals[anas.hash]).toMatchObject({ spot: 1 })
    // An approval written before spots were recorded.
    if (dropSpot) delete world.mailboxes.get('mb-mila')!.approvals[anas.hash].spot

    const milaNew = createPeer(world, 'mila')
    await milaNew.service.restoreSharedCourse({ oldCode: 'old-code', publicId: 'pubid0000000000a', sharedKey: 'shared-key' })
    // Marko proposes a rival 0.4 for the same spot.
    marko.published.version = '0.4'
    await marko.service.publishShared('course-1')
    await milaNew.service.refresh('pubid0000000000a')
    return { anas, milaNew }
  }

  for (const dropSpot of [false, true]) {
    it(`a restored computer remembers what was approved (${dropSpot ? 'older approval, spot checked again' : 'spot in the approval'})`, async () => {
      const { anas, milaNew } = await restoredAfterApproving({ dropSpot })
      const items = milaNew.service.listApprovals().items
      expect(items.find((item) => item.hash === anas.hash)).toMatchObject({ group: 'waiting-for-others' })
      const markos = items.find((item) => item.version === '0.4')!
      expect(markos).toMatchObject({ group: 'waiting-for-you' })
      await expect(milaNew.service.approve('pubid0000000000a', markos.hash)).rejects.toMatchObject({ code: 'ALREADY_APPROVED' })
      expect(milaNew.state().courses.pubid0000000000a.approvedAt).toEqual({ 1: anas.hash })
    })
  }

  it('a proposal its proposer replaced with a newer one is Replaced', async () => {
    const { ana, mila } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    const second = await ana.service.startSharing('course-1', 2)
    await mila.service.refresh('pubid0000000000a')
    const items = mila.service.listApprovals().items
    expect(items.find((item) => item.hash === second.hash)).toMatchObject({ group: 'waiting-for-you' })
    // Mila never saw the first one: only proposals seen are listed.
    expect(items.find((item) => item.hash === first.hash)).toBeUndefined()
    expect(ana.service.listApprovals().items.find((item) => item.hash === first.hash)).toMatchObject({ group: 'replaced' })
  })

  it('never approves two different versions for the same spot', async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    // Accepting reads the owner's mailbox in the background: wait for it.
    await marko.service.refresh('pubid0000000000a')

    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)

    // Ana proposes again before it was committed (same spot): Marko's app refuses.
    const second = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await expect(marko.service.approve('pubid0000000000a', second.hash)).rejects.toMatchObject({ code: 'ALREADY_APPROVED' })
  })

  it('refuses a rule that is not more than half', async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    // Accepting reads the owner's mailbox in the background: wait for it.
    await marko.service.refresh('pubid0000000000a')

    await expect(ana.service.startSharing('course-1', 1)).rejects.toMatchObject({ code: 'INVALID_QUORUM' })
  })

  // Restoring on a new computer (SLJ-54): the owner's course moved to a shared
  // one; she takes it up again from what the shared course says.
  it("restores the owner's shared course from its source.json, with the others' mailboxes", async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    await marko.service.refresh('pubid0000000000a')
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)
    await ana.service.refresh('pubid0000000000a')

    // Ana's new computer: same identity (same keys), nothing else.
    const restored = createPeer(world, 'ana')
    expect(
      await restored.service.restoreSharedCourse({ oldCode: 'old-code', publicId: 'pubid0000000000a', sharedKey: 'shared-key' }),
    ).toEqual({ courseId: 'course-1', title: 'Fractions' })
    expect(restored.landCourse).toHaveBeenCalledWith({ courseId: 'course-1', stagingPath: '/staging', version: '0.2' })
    expect(restored.service.getInfo('course-1')).toMatchObject({ quorum: 2, role: 'owner', sharedKey: 'shared-key' })
    expect(restored.state().courses.pubid0000000000a.members.map((member) => member.mailboxKey)).toEqual(['mb-ana', 'mb-marko'])
  })

  it('lets a maintainer back in with a new invite after the course is shared', async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    await marko.service.refresh('pubid0000000000a')
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)
    await ana.service.refresh('pubid0000000000a')

    // Marko's new computer joins again with a fresh code, and gets the course.
    const markoAgain = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await markoAgain.service.accept('invite-pubid0000000000a')
    await markoAgain.service.refresh('pubid0000000000a')
    expect(markoAgain.landCourse).toHaveBeenCalledWith({ courseId: 'course-1', stagingPath: '/staging', version: '0.2' })
    expect(markoAgain.service.isShared('course-1')).toBe(true)
    expect(ana.state().courses.pubid0000000000a.members).toHaveLength(2)
  })
})

// SLJ-67: a proposal's release notes, as its review page shows them.
describe('notesSince', () => {
  const entry = (version: string, notes?: string) => ({ changes: [], cutAt: '', notes, version })

  it('keeps the entries newer than the version online, up to the proposed one, newest first', () => {
    const changelog = [entry('0.2', 'first'), entry('0.3', 'fix'), entry('0.4', 'new section'), entry('0.5', 'later')]
    expect(notesSince(changelog, '0.2', '0.4').map((item) => item.version)).toEqual(['0.4', '0.3'])
  })

  it('keeps everything up to the proposed version for a first version, and drops malformed entries', () => {
    const changelog = [entry('0.2'), { version: '9.9.9', changes: [] }, { notes: 'no version' }, null, entry('0.3', 'x'.repeat(6000))]
    const notes = notesSince(changelog, null, '0.3')
    expect(notes.map((item) => item.version)).toEqual(['0.3', '0.2'])
    expect(notes[0].notes).toHaveLength(5000)
  })
})

