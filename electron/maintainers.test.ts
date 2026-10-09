import { describe, expect, it, vi } from 'vitest'

import { createMaintainers, type MaintainersService, type MaintainersState } from './maintainers'

// A fake of what the worker does (mailboxes, the shared course), shared by
// two maintainers' services, so the decisions are tested without a network.
type Mailbox = {
  approvals: Record<string, { response?: unknown }>
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
  shared: { length: number; version: string | null }
  versions: Map<string, string> // request -> version
}

function createWorld(): World {
  return {
    commits: [],
    mailboxes: new Map(),
    moved: [],
    owner: null,
    shared: { length: 0, version: null },
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
        return { hash: `h-${request}`, length: world.shared.length + 1, proposalKey: `prop-${request}`, request }
      }
      case 'sign':
        return { response: `sig-${self.maintainerKey}-${args.request}` }
      case 'review':
        return { changes: [{ kind: 'changed', path: '/lesson.md' }], length: world.shared.length + 1, sharedLength: world.shared.length }
      case 'commit':
        world.commits.push({ first: args.first as boolean, request: args.request as string, responses: args.responses as string[] })
        world.shared = { length: world.shared.length + 1, version: world.versions.get(args.request as string)! }
        return { sharedKey: 'shared-key' }
      case 'moveNotice':
        world.moved.push(args.courseId as string)
        return {}
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

    expect(await ana.service.invite('course-1')).toEqual({ code: 'invite-pubid0000000000a' })
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
    expect(marko.service.listApprovals()).toEqual([
      { courseId: null, from: 'pub-ana', hash: proposal.hash, publicId: 'pubid0000000000a', title: null, version: '0.2' },
    ])
    expect(await marko.service.review('pubid0000000000a', proposal.hash)).toMatchObject({ version: '0.2' })

    // One approval isn't enough: nothing is committed yet.
    await ana.service.refresh('pubid0000000000a')
    expect(world.commits).toEqual([])

    await marko.service.approve('pubid0000000000a', proposal.hash)
    expect(marko.service.listApprovals()).toEqual([])
    await ana.service.refresh('pubid0000000000a')

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
  })

  it("a maintainer's Publish becomes a proposal; the owner approves; it goes online", async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1')
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
    const [waiting] = ana.service.listApprovals()
    expect(waiting).toMatchObject({ courseId: 'course-1', from: 'pub-marko', version: '0.3' })
    await ana.service.approve('pubid0000000000a', waiting.hash)
    await marko.service.refresh('pubid0000000000a')

    expect(world.commits.at(-1)).toMatchObject({ first: false })
    expect(world.shared.version).toBe('0.3')
  })

  it('never approves two different versions for the same spot', async () => {
    const world = createWorld()
    const ana = createPeer(world, 'ana', { courseId: 'course-1' })
    const marko = createPeer(world, 'marko')
    await ana.service.invite('course-1')
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
    await ana.service.invite('course-1')
    await marko.service.accept('invite-pubid0000000000a')
    // Accepting reads the owner's mailbox in the background: wait for it.
    await marko.service.refresh('pubid0000000000a')

    await expect(ana.service.startSharing('course-1', 1)).rejects.toMatchObject({ code: 'INVALID_QUORUM' })
  })
})
