import { describe, expect, it, vi } from 'vitest'

import { createMaintainers, notesSince, type MaintainersService, type MaintainersState } from './maintainers'

// A fake of what the worker does (mailboxes, the shared course), shared by
// two maintainers' services, so the decisions are tested without a network.
type Mailbox = {
  approvals: Record<string, { generation?: unknown; response?: unknown; responseNext?: unknown; spot?: unknown }>
  changesRequested: Record<string, { note?: unknown }>
  members: unknown
  profile?: unknown
  proposal: unknown
  withdrawn: Record<string, unknown>
}

type Self = { mailboxKey: string; maintainerKey: string; publisherId: string }

type Shared = { length: number; source: unknown; version: string | null }

type World = {
  commits: { first: boolean; request: string; responses: string[] }[]
  // Proposal drives deleted and opened again (SLJ-111).
  dropped: string[]
  opened: string[]
  mailboxes: Map<string, Mailbox>
  moved: string[]
  // Whose invite is being accepted.
  owner: { self: Self; service: MaintainersService } | null
  // request -> the shared course's length once it's committed
  lengths: Map<string, number>
  // The shared course (generation 0), and later generations' (SLJ-70).
  shared: Shared
  generations: Map<number, Shared>
  requestGenerations: Map<string, number> // request -> the generation it's for
  sources: Map<string, unknown> // request -> its source.json
  versions: Map<string, string> // request -> version
}

function createWorld(): World {
  return {
    commits: [],
    dropped: [],
    opened: [],
    lengths: new Map(),
    mailboxes: new Map(),
    moved: [],
    owner: null,
    shared: { length: 0, source: null, version: null },
    generations: new Map(),
    requestGenerations: new Map(),
    sources: new Map(),
    versions: new Map(),
  }
}

function sharedAt(world: World, generation: number): Shared {
  if (generation === 0) return world.shared
  if (!world.generations.has(generation)) world.generations.set(generation, { length: 0, source: null, version: null })
  return world.generations.get(generation)!
}

function setShared(world: World, generation: number, shared: Shared) {
  if (generation === 0) world.shared = shared
  else world.generations.set(generation, shared)
}

const keyOf = (generation: number) => (generation > 0 ? `shared-key-g${generation}` : 'shared-key')
const generationOf = (args: Record<string, unknown>) => (args.spec as { generation?: number } | undefined)?.generation ?? 0

function createPeer(
  world: World,
  name: string,
  { courseId = null as string | null, publishedVersion = '0.2', publisherName = '' } = {},
) {
  const self = { mailboxKey: `mb-${name}`, maintainerKey: `mk-${name}`, publisherId: `pub-${name}` }
  let state: MaintainersState = { courses: {} }
  let proposals = 0
  const published = { version: publishedVersion }
  const mailbox = () => {
    if (!world.mailboxes.has(self.mailboxKey)) {
      world.mailboxes.set(self.mailboxKey, { approvals: {}, changesRequested: {}, members: null, proposal: null, withdrawn: {} })
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
        else if (file === '/profile.json') box.profile = args.value
        else if (file.startsWith('/approvals/')) box.approvals[file.slice(11, -5)] = args.value as { response: unknown }
        else if (file.startsWith('/withdrawn/')) box.withdrawn[file.slice(11, -5)] = args.value
        else if (file.startsWith('/changes-requested/')) box.changesRequested[file.slice(19, -5)] = args.value as { note: unknown }
        return {}
      }
      case 'readMailbox':
        return world.mailboxes.get(args.key as string) ?? { approvals: {}, changesRequested: {}, members: null, proposal: null, withdrawn: {} }
      case 'followMailbox':
        return {}
      case 'dropProposal':
        world.dropped.push(args.proposalKey as string)
        return { cleared: true }
      case 'openProposal':
        world.opened.push(args.proposalKey as string)
        return { opened: true }
      case 'seedShared': {
        const shared = sharedAt(world, generationOf(args))
        return {
          courseId: shared.version ? 'course-1' : null,
          length: shared.length,
          sharedKey: keyOf(generationOf(args)),
          version: shared.version,
        }
      }
      case 'propose': {
        const request = `req-${name}-${proposals++}`
        const shared = sharedAt(world, generationOf(args))
        world.versions.set(request, published.version)
        world.sources.set(request, args.source)
        world.lengths.set(request, shared.length + 1)
        world.requestGenerations.set(request, generationOf(args))
        return {
          hash: `h-${request}`,
          length: shared.length + 1,
          proposalKey: `prop-${request}`,
          request,
          sharedLength: shared.length,
        }
      }
      case 'sign':
        return { response: `sig-${self.maintainerKey}-${args.request}` }
      case 'proposalState': {
        const request = args.request as string
        if (world.commits.some((commit) => commit.request === request)) return { state: 'online' }
        const shared = sharedAt(world, world.requestGenerations.get(request) ?? 0)
        return { state: shared.length >= (world.lengths.get(request) ?? Infinity) ? 'replaced' : 'waiting' }
      }
      case 'review': {
        const request = args.request as string
        // A request is checked against the shared course it names.
        if ((world.requestGenerations.get(request) ?? 0) !== generationOf(args)) throw new Error('This request is not for this course')
        const shared = sharedAt(world, generationOf(args))
        // A moved notice (SLJ-70) changes only source.json, which isn't listed.
        const moved = Boolean((world.sources.get(request) as { movedTo?: unknown } | undefined)?.movedTo)
        return {
          changelog: [{ changes: [], cutAt: '', notes: 'Fixed a typo', version: '0.2' }],
          changes: moved ? [] : [{ kind: 'changed', path: '/lesson.md' }],
          length: shared.length + 1,
          sharedLength: shared.length,
        }
      }
      case 'commit': {
        const generation = generationOf(args)
        const request = args.request as string
        if ((world.requestGenerations.get(request) ?? 0) !== generation) throw new Error('This request is not for this course')
        const shared = sharedAt(world, generation)
        if (world.lengths.get(request) !== shared.length + 1) throw new Error("This version doesn't build on the course's latest version")
        world.commits.push({ first: args.first as boolean, request, responses: args.responses as string[] })
        setShared(world, generation, {
          length: shared.length + 1,
          source: world.sources.get(request),
          version: world.versions.get(request)!,
        })
        return { sharedKey: keyOf(generation) }
      }
      case 'moveNotice':
        world.moved.push(args.courseId as string)
        return {}
      case 'readSharedSource': {
        const key = args.sharedKey as string
        const shared = sharedAt(world, key === 'shared-key' ? 0 : Number(key.slice('shared-key-g'.length)))
        const movedTo = (shared.source as { movedTo?: { driveKey?: string } } | null)?.movedTo?.driveKey ?? null
        return { courseId: 'course-1', movedTo, source: shared.source, title: 'Fractions', version: shared.version }
      }
      case 'downloadShared':
        return { courseId: 'course-1', version: sharedAt(world, generationOf(args)).version }
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
    ownPublisherName: () => publisherName,
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
          withdrawn: false,
          change: null,
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
    const { ana, marko } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await marko.service.approve('pubid0000000000a', first.hash)

    // Ana can't withdraw it now (Marko's approval is out there), so she can't
    // propose another version for the same spot either.
    await expect(ana.service.startSharing('course-1', 2)).rejects.toMatchObject({ code: 'APPROVED_BY_OTHERS' })
    await expect(ana.service.withdraw('pubid0000000000a', first.hash)).rejects.toMatchObject({ code: 'APPROVED_BY_OTHERS' })
    // (Rivals from another maintainer: the cases below.)
  })

  // SLJ-110: proposing takes the spot.
  it("a proposer can't approve a rival for the spot their own version holds, until they withdraw it", async () => {
    const { ana, marko, mila, world } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    for (const peer of [marko, mila]) {
      await peer.service.refresh('pubid0000000000a')
      await peer.service.approve('pubid0000000000a', first.hash)
    }
    for (const peer of [ana, marko, mila]) await peer.service.refresh('pubid0000000000a')

    // Ana proposes 0.3 and Marko a rival 0.4, for the same spot.
    ana.published.version = '0.3'
    await ana.service.publishShared('course-1')
    marko.published.version = '0.4'
    await marko.service.publishShared('course-1')
    await ana.service.refresh('pubid0000000000a')
    await mila.service.refresh('pubid0000000000a')
    const anas = ana.service.listApprovals().items.find((item) => item.version === '0.3')!
    const markos = ana.service.listApprovals().items.find((item) => item.version === '0.4')!
    expect(anas).toMatchObject({ group: 'waiting-for-others', mine: true })
    await expect(ana.service.approve('pubid0000000000a', markos.hash)).rejects.toMatchObject({ code: 'ALREADY_APPROVED' })

    // Nobody approved hers: she withdraws it, and can approve Marko's.
    await ana.service.withdraw('pubid0000000000a', anas.hash)
    expect(ana.service.listApprovals().items.find((item) => item.hash === anas.hash)).toMatchObject({
      group: 'replaced',
      withdrawn: true,
    })
    expect(ana.service.getInfo('course-1')?.proposal).toBeNull()
    // Publish runs again at every start: a withdrawn version isn't proposed again.
    await ana.service.publishShared('course-1')
    expect(ana.service.getInfo('course-1')?.proposal).toBeNull()
    await ana.service.approve('pubid0000000000a', markos.hash)
    await marko.service.refresh('pubid0000000000a')
    expect(world.shared.version).toBe('0.4')

    // Mila's app sees it withdrawn, and won't approve it.
    await mila.service.refresh('pubid0000000000a')
    expect(mila.service.listApprovals().items.find((item) => item.hash === anas.hash)).toMatchObject({ withdrawn: true })
    await expect(mila.service.approve('pubid0000000000a', anas.hash)).rejects.toMatchObject({ code: 'NO_PROPOSAL' })
  })

  it("a proposal another maintainer approved can't be withdrawn, and approving it after a withdrawal is refused", async () => {
    const { ana, marko, mila } = await threeMaintainers()
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh('pubid0000000000a')
    await mila.service.refresh('pubid0000000000a')
    // Marko approves; Ana can't withdraw any more.
    await marko.service.approve('pubid0000000000a', first.hash)
    await expect(ana.service.withdraw('pubid0000000000a', first.hash)).rejects.toMatchObject({ code: 'APPROVED_BY_OTHERS' })
    expect(mila.service.listApprovals().items).toMatchObject([{ group: 'waiting-for-you' }])
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
    ).toEqual({ courseId: 'course-1', sharedKey: 'shared-key', title: 'Fractions' })
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

// SLJ-111: a proposal's drive holds a copy of the course's whole history; it
// goes once the proposal is over, and a waiting one is opened again at start.
describe('proposal drives (SLJ-111)', () => {
  const ID = 'pubid0000000000a'

  async function sharedByThree() {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    const mila = createPeer(world, 'mila')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept(`invite-${ID}`)
    await ana.service.invite('course-1', 'pub-mila')
    await mila.service.accept(`invite-${ID}`)
    for (const peer of [marko, mila]) await peer.service.refresh(ID)
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh(ID)
    await marko.service.approve(ID, first.hash)
    await ana.service.refresh(ID)
    for (const peer of [marko, mila]) await peer.service.refresh(ID)
    return { ana, first, marko, mila, world }
  }

  it('deletes a committed proposal\'s drive once', async () => {
    const { ana, first, world } = await sharedByThree()
    expect(world.dropped.filter((key) => key === first.proposalKey).length).toBeGreaterThan(0)
    expect(ana.state().courses[ID].proposals?.[first.hash]).toMatchObject({ cleared: true, state: 'online' })
    const before = world.dropped.length
    await ana.service.refresh(ID)
    expect(world.dropped.length).toBe(before)
  })

  it("deletes our proposal once another version took its spot, and it no longer waits", async () => {
    const { ana, marko, mila, world } = await sharedByThree()
    ana.published.version = '0.3'
    marko.published.version = '0.4'
    const anas = await ana.service.publishShared('course-1').then(() => ana.state().courses[ID].proposal!)
    await marko.service.publishShared('course-1')
    await mila.service.refresh(ID)
    const markos = mila.service.listApprovals().items.find((item) => item.version === '0.4')!
    await mila.service.approve(ID, markos.hash)
    await marko.service.refresh(ID)

    await ana.service.refresh(ID)
    expect(world.dropped).toContain(anas.proposalKey)
    expect(ana.service.getInfo('course-1')?.proposal).toBeNull()
    expect(ana.state().courses[ID].proposals?.[anas.hash]).toMatchObject({ cleared: true, state: 'replaced' })
  })

  it('opens our waiting proposal again at start', async () => {
    const { marko, world } = await sharedByThree()
    marko.published.version = '0.3'
    await marko.service.publishShared('course-1')
    const waiting = marko.state().courses[ID].proposal!
    await marko.service.start()
    expect(world.opened).toEqual([waiting.proposalKey])
  })
})

// SLJ-70: changing who maintains a shared course, or the rule, moves it to
// the next generation's shared course.
describe('changing maintainers (SLJ-70)', () => {
  const ID = 'pubid0000000000a'

  // Ana and Marko share a course (both must approve).
  async function sharedByTwo() {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept(`invite-${ID}`)
    await marko.service.refresh(ID)
    const first = await ana.service.startSharing('course-1', 2)
    await marko.service.refresh(ID)
    await marko.service.approve(ID, first.hash)
    await ana.service.refresh(ID)
    await marko.service.refresh(ID)
    return { ana, marko, world }
  }

  // ...and Mila joins with an invite, then a change adding her is approved.
  async function sharedByThree() {
    const { ana, marko, world } = await sharedByTwo()
    const mila = createPeer(world, 'mila')
    await ana.service.invite('course-1', 'pub-mila')
    await mila.service.accept(`invite-${ID}`)
    await mila.service.refresh(ID)
    const change = await ana.service.proposeChange('course-1', { publisherIds: ['pub-marko', 'pub-mila'], quorum: 2 })
    for (const peer of [marko, mila]) {
      await peer.service.refresh(ID)
      await peer.service.approve(ID, change.hash)
    }
    await ana.service.refresh(ID)
    for (const peer of [marko, mila]) await peer.service.refresh(ID)
    return { ana, change, marko, mila, world }
  }

  it('adds a maintainer: the current ones approve the move, the new ones the new course, and everyone follows', async () => {
    const { ana, marko, world } = await sharedByTwo()
    const mila = createPeer(world, 'mila')
    await ana.service.invite('course-1', 'pub-mila')
    await mila.service.accept(`invite-${ID}`)
    await mila.service.refresh(ID)
    // She joined, but isn't a maintainer yet.
    expect(ana.service.getInfo('course-1')).toMatchObject({ members: [{ publisherId: 'pub-ana' }, { publisherId: 'pub-marko' }], pending: [{ publisherId: 'pub-mila' }] })

    const change = await ana.service.proposeChange('course-1', { publisherIds: ['pub-marko', 'pub-mila'], quorum: 2 })
    expect(ana.service.getInfo('course-1')?.proposal).toMatchObject({ change: { quorum: 2 } })
    await marko.service.refresh(ID)
    expect(marko.service.listApprovals().items.find((item) => item.hash === change.hash)).toMatchObject({
      change: { added: ['pub-mila'], approvedBy: ['pub-ana'], missing: ['pub-marko', 'pub-mila'], previousQuorum: 2, quorum: 2, removed: [] },
      group: 'waiting-for-you',
    })
    await marko.service.approve(ID, change.hash)
    // Marko signed both parts: the move under the current rule, the new course under the new one.
    expect(world.mailboxes.get('mb-marko')!.approvals[change.hash]).toMatchObject({ response: expect.any(String), responseNext: expect.any(String) })

    // Both rules are met by Ana and Marko (2 of 2 now, 2 of 3 next), without
    // Mila: Ana's app commits the new course first, then the moved notice.
    await ana.service.refresh(ID)
    expect(world.generations.get(1)).toMatchObject({ version: '0.2' })
    expect(world.shared.source).toMatchObject({ movedTo: { driveKey: 'shared-key-g1' } })
    expect(world.commits.slice(-2).map((commit) => commit.first)).toEqual([true, false])
    expect(ana.state().courses[ID]).toMatchObject({ generation: 1, pending: [], quorum: 2, sharedKey: 'shared-key-g1' })
    expect(ana.onShared).toHaveBeenLastCalledWith('course-1')

    // Marko's app follows to the new code; Mila's lands the course.
    marko.onShared.mockClear()
    await marko.service.refresh(ID)
    expect(marko.state().courses[ID]).toMatchObject({ generation: 1, sharedKey: 'shared-key-g1' })
    expect(marko.onShared).toHaveBeenCalledWith('course-1')
    await mila.service.refresh(ID)
    expect(mila.landCourse).toHaveBeenCalledWith({ courseId: 'course-1', stagingPath: '/staging', version: '0.2' })
    expect(mila.service.isShared('course-1')).toBe(true)
    // Mila's approval is no longer needed: the change is Approved for her too.
    expect(mila.service.listApprovals().items.find((item) => item.hash === change.hash)).toMatchObject({ group: 'approved' })
  })

  it('a version proposed after the change goes online under the new rule', async () => {
    const { ana, marko, world } = await sharedByThree()
    marko.published.version = '0.3'
    await marko.service.publishShared('course-1')
    await ana.service.refresh(ID)
    const waiting = ana.service.listApprovals().items.find((item) => item.version === '0.3')!
    expect(waiting).toMatchObject({ group: 'waiting-for-you', quorum: 2 })
    await ana.service.approve(ID, waiting.hash)
    await marko.service.refresh(ID)
    expect(world.generations.get(1)).toMatchObject({ version: '0.3' })
  })

  it('removes a maintainer without them; their app stops maintaining the course', async () => {
    const { ana, marko, mila } = await sharedByThree()
    const change = await ana.service.proposeChange('course-1', { publisherIds: ['pub-marko'], quorum: 2 })
    await marko.service.refresh(ID)
    expect(marko.service.listApprovals().items.find((item) => item.hash === change.hash)?.change).toMatchObject({ removed: ['pub-mila'] })
    await marko.service.approve(ID, change.hash)
    await ana.service.refresh(ID)
    expect(ana.state().courses[ID]).toMatchObject({ generation: 2, members: [{ publisherId: 'pub-ana' }, { publisherId: 'pub-marko' }] })

    await mila.service.refresh(ID)
    expect(mila.service.getInfo('course-1')).toMatchObject({ removed: true })
    expect(mila.service.isShared('course-1')).toBe(false)
    expect(mila.service.listApprovals().maintained).toBe(0)
  })

  it("restoring the owner follows the chain of moves to the latest shared course", async () => {
    const { world } = await sharedByThree()
    const restored = createPeer(world, 'ana')
    expect(await restored.service.restoreSharedCourse({ oldCode: 'old-code', publicId: ID, sharedKey: 'shared-key' })).toEqual({
      courseId: 'course-1',
      sharedKey: 'shared-key-g1',
      title: 'Fractions',
    })
    expect(restored.state().courses[ID]).toMatchObject({ generation: 1, previous: [{ generation: 0, quorum: 2 }], role: 'owner' })
    expect(restored.state().courses[ID].members).toHaveLength(3)
  })

  it("refuses a change that isn't one, a rule that isn't more than half, or someone who hasn't joined", async () => {
    const { ana } = await sharedByTwo()
    await expect(ana.service.proposeChange('course-1', { publisherIds: ['pub-marko'], quorum: 2 })).rejects.toMatchObject({ code: 'NO_CHANGE' })
    await expect(ana.service.proposeChange('course-1', { publisherIds: ['pub-stranger'], quorum: 2 })).rejects.toMatchObject({
      code: 'UNKNOWN_MAINTAINER',
    })
    await expect(ana.service.proposeChange('course-1', { publisherIds: [], quorum: 1 })).rejects.toMatchObject({ code: 'NO_MAINTAINERS' })
  })

  it('a change nobody approved yet can be withdrawn, and a version can be proposed again', async () => {
    const { ana, marko, world } = await sharedByTwo()
    const mila = createPeer(world, 'mila')
    await ana.service.invite('course-1', 'pub-mila')
    await mila.service.accept(`invite-${ID}`)
    const change = await ana.service.proposeChange('course-1', { publisherIds: ['pub-marko', 'pub-mila'], quorum: 3 })
    await marko.service.refresh(ID)
    // A Publish while the change waits doesn't replace it.
    ana.published.version = '0.3'
    await ana.service.publishShared('course-1')
    expect(ana.service.getInfo('course-1')?.proposal?.change).not.toBeNull()

    await ana.service.withdraw(ID, change.hash)
    await marko.service.refresh(ID)
    expect(marko.service.listApprovals().items.find((item) => item.hash === change.hash)).toMatchObject({ withdrawn: true })
    await ana.service.publishShared('course-1')
    expect(ana.service.getInfo('course-1')?.proposal).toMatchObject({ change: null, version: '0.3' })
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

// Students see every maintainer of a course maintained together, each with
// their Publisher name: each maintainer's app puts its own in its mailbox, and
// whoever proposes a version writes everyone's into the course's source.json.
describe('maintainers: Publisher names', () => {
  it("carries every maintainer's name in the shared course's source.json", async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1', publisherName: 'Ana' })
    const marko = createPeer(world, 'marko', { publisherName: '  Marko\n' })

    await ana.service.invite('course-1', 'pub-marko')
    await marko.service.accept('invite-pubid0000000000a')
    await marko.service.refresh('pubid0000000000a')
    await ana.service.refresh('pubid0000000000a')
    expect(world.mailboxes.get('mb-marko')?.profile).toEqual({ name: 'Marko' })
    expect(ana.state().courses.pubid0000000000a.names).toEqual({ 'pub-ana': 'Ana', 'pub-marko': 'Marko' })

    await ana.service.startSharing('course-1', 2)
    expect([...world.sources.values()][0]).toMatchObject({
      maintainers: {
        members: [
          { name: 'Ana', publisherId: 'pub-ana' },
          { name: 'Marko', publisherId: 'pub-marko' },
        ],
      },
      publisher: { id: 'pub-ana', name: 'Ana' },
    })
  })
})


// Before the password is given, every refresh at start meets a locked
// identity: not logged as a failure (the next periodic refresh works).
describe('maintainers: a locked identity', () => {
  it("doesn't log refreshes that meet a locked identity", async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    await ana.service.invite('course-1', 'pub-marko')
    const locked = Object.assign(new Error('The publishing identity is locked'), { code: 'LOCKED' })
    ana.op.mockImplementation(async () => {
      throw locked
    })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    await ana.service.start()
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})
