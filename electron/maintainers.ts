// Courses maintained by several publishers (SLJ-11): a version goes online
// only when more than half of the maintainers approve it.
//
// The worker carries the operations out (workers/shared-course.cjs,
// workers/maintainers.cjs); this decides when, and keeps what each
// maintainer's app knows about each shared course (per profile).
//
// - The owner invites maintainers (one code each, `invite`). Their answers
//   arrive as `onJoined`; the owner writes who maintains the course and the
//   rule to their mailbox (`/members.json`), which the others read.
// - `startSharing`: the owner proposes the course's current version as the
//   shared course's first. Once approved and committed, the old drive gets
//   the "moved" notice and students follow the course to its new code.
// - Every later Publish (anyone's) is a proposal (`publishShared`): the
//   proposer's app approves it too, the others' apps list it for review
//   (`listApprovals`, `review`, `approve`, `requestChanges`), and whoever
//   proposed it commits it once enough approvals arrived.
// - Each app approves at most one version for each spot in the course's
//   history (the shared course's length it builds on): with more than half
//   needed, that's what keeps two versions from both being approved.
//
// No Electron dependency: unit-tested in maintainers.test.ts.

import { compareCourseVersions, parseCourseVersion } from '../src/lib/course-versioning'
import type { MaintainerSelf, MailboxContents, ProposalChange, SharedCourseSpecInput } from './bare-worker'

export type Member = MaintainerSelf

export type SharedProposal = {
  first: boolean
  hash: string
  proposalKey: string
  request: string
  version: string
}

export type InboxItem = {
  from: string
  hash: string
  mailboxKey: string
  proposalKey: string
  request: string
  version: string
}

export type SharedCourseRecord = {
  // The course's own id on this device: the owner's from the start, an
  // invited maintainer's once the shared course has landed here.
  courseId: string | null
  // Proposals this maintainer answered (approved, or asked to change), by
  // request hash: they leave the inbox.
  answered: string[]
  // Each maintainer approves at most one version per spot (the shared
  // course's length it builds on): spot -> request hash.
  approvedAt: Record<string, string>
  // Notes asking for changes to our proposal, by publisher id.
  changesRequested: Record<string, string>
  inbox: Record<string, InboxItem>
  // Maintainers, the owner first. Ours as the owner wrote them.
  members: Member[]
  nextProposalIndex: number
  // The owner's: the course's code before it moved (kept shared).
  oldCode: string | null
  // A maintainer's: whose /members.json to read.
  ownerMailboxKey: string | null
  proposal: SharedProposal | null
  publicId: string
  quorum: number
  role: 'maintainer' | 'owner'
  // The shared course's key, known as soon as the maintainers are (its
  // drive's changes then reach us), and `sharedKey` once it has its first
  // version.
  sharedCourseKey?: string | null
  sharedKey: string | null
}

export type MaintainersState = { courses: Record<string, SharedCourseRecord> }

type Op = <K extends keyof Ops>(op: K, args: Ops[K][0]) => Promise<Ops[K][1]>
type Ops = {
  acceptInvite: [{ code: string }, { ownerMailboxKey: string; publicId: string }]
  commit: [
    { first: boolean; proposalKey: string; request: string; responses: string[]; spec: SharedCourseSpecInput },
    { sharedKey: string },
  ]
  createInvite: [{ publicId: string }, { code: string }]
  downloadShared: [{ spec: SharedCourseSpecInput; stagingPath: string }, { courseId: string; version: string }]
  dropProposal: [{ proposalKey: string }, unknown]
  followMailbox: [{ key: string }, unknown]
  moveNotice: [{ courseId: string; publicId: string; sharedKey: string }, unknown]
  propose: [
    { index: number; source: unknown; spec: SharedCourseSpecInput; versionPath: string },
    { hash: string; length: number; proposalKey: string; request: string },
  ]
  readMailbox: [{ key: string }, MailboxContents]
  review: [
    { proposalKey: string; request: string; spec: SharedCourseSpecInput },
    { changes: ProposalChange[]; length: number; sharedLength: number },
  ]
  seedShared: [{ spec: SharedCourseSpecInput }, { courseId: string | null; sharedKey: string; version: string | null }]
  self: [{ publicId: string }, MaintainerSelf]
  sign: [{ request: string; spec: SharedCourseSpecInput }, { response: string }]
  writeMailbox: [{ file: string; publicId: string; value: unknown }, unknown]
}

export type MaintainersDeps = {
  op: Op
  // The course's published state as a teacher's course: its public id once
  // it's online, its published version and that version's folder.
  publishedCourse(courseId: string): Promise<{
    code: string | null
    publicId: string | null
    version: string | null
    versionPath: string | null
  }>
  // Keeps the course's old drive shared (the owner's): students still on
  // the old code find the "moved" notice there.
  seedOldCode(courseId: string, code: string): Promise<void>
  // Lands a shared course here as this maintainer's own (editable) course.
  landCourse(input: { courseId: string; stagingPath: string; version: string }): Promise<unknown>
  courseOnDevice(courseId: string): Promise<boolean>
  createStagingPath(): Promise<string>
  removeStaging(stagingPath: string): Promise<void>
  // The course is online at `sharedKey` now: share it from there.
  onShared(courseId: string): void
  store: { read(): MaintainersState; write(state: MaintainersState): void }
}

export class MaintainersError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export function createMaintainers(deps: MaintainersDeps) {
  // One refresh at a time per course: events arrive in bursts.
  const queues = new Map<string, Promise<unknown>>()

  function serial<T>(publicId: string, run: () => Promise<T>): Promise<T> {
    const previous = queues.get(publicId) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(run)
    queues.set(publicId, next)
    return next
  }

  function records(): Record<string, SharedCourseRecord> {
    return deps.store.read().courses ?? {}
  }

  function save(record: SharedCourseRecord) {
    const state = deps.store.read()
    deps.store.write({ ...state, courses: { ...state.courses, [record.publicId]: record } })
  }

  function recordFor(courseId: string): SharedCourseRecord | null {
    return Object.values(records()).find((record) => record.courseId === courseId) ?? null
  }

  function specOf(record: SharedCourseRecord): SharedCourseSpecInput {
    return { publicId: record.publicId, quorum: record.quorum, signers: record.members.map((member) => member.maintainerKey) }
  }

  // More than half, and no more than there are maintainers.
  function assertRule(quorum: number, count: number) {
    if (!Number.isInteger(quorum) || quorum <= count / 2 || quorum > count) {
      throw new MaintainersError('INVALID_QUORUM', `A version needs more than half of ${count} maintainers`)
    }
  }

  async function writeMembers(record: SharedCourseRecord) {
    await deps.op('writeMailbox', {
      file: '/members.json',
      publicId: record.publicId,
      value: { members: record.members, publicId: record.publicId, quorum: record.quorum },
    })
  }

  // The shared course's source.json: where it's shared from, the original
  // publisher (so students' update checks still pass), and its maintainers.
  function sourceFor(record: SharedCourseRecord, sharedKey: string) {
    return {
      driveKey: sharedKey,
      maintainers: {
        members: record.members.map(({ maintainerKey, publisherId }) => ({ maintainerKey, publisherId })),
        quorum: record.quorum,
      },
      publicId: record.publicId,
      publisher: { id: record.members[0].publisherId },
    }
  }

  async function propose(record: SharedCourseRecord, { first }: { first: boolean }) {
    if (!record.courseId) throw new MaintainersError('NOT_HERE', 'This course is not on this device yet')
    const published = await deps.publishedCourse(record.courseId)
    if (!published.versionPath || !published.version) {
      throw new MaintainersError('NOT_PUBLISHED', 'Publish a version first')
    }

    const spec = specOf(record)
    const { sharedKey } = await deps.op('seedShared', { spec })
    const index = record.nextProposalIndex
    const { hash, proposalKey, request } = await deps.op('propose', {
      index,
      source: sourceFor(record, sharedKey),
      spec,
      versionPath: published.versionPath,
    })
    if (record.proposal) await deps.op('dropProposal', { proposalKey: record.proposal.proposalKey }).catch(() => {})

    const proposal: SharedProposal = { first, hash, proposalKey, request, version: published.version }
    // The proposer approves their own proposal too.
    const { response } = await deps.op('sign', { request, spec })
    await deps.op('writeMailbox', { file: '/proposal.json', publicId: record.publicId, value: proposal })
    await deps.op('writeMailbox', { file: `/approvals/${hash}.json`, publicId: record.publicId, value: { response } })
    save({ ...record, changesRequested: {}, nextProposalIndex: index + 1, proposal })
    return proposal
  }

  // Reads every mailbox of the course and acts: new members and rule (from
  // the owner's), proposals to review, approvals of ours (commit once there
  // are enough), and the shared course landing here for a new maintainer.
  async function refresh(publicId: string): Promise<void> {
    let record = records()[publicId]
    if (!record) return
    const self = await deps.op('self', { publicId })

    if (record.role === 'maintainer' && record.ownerMailboxKey) {
      const owner = await deps.op('readMailbox', { key: record.ownerMailboxKey })
      const members = parseMembers(owner.members, publicId)
      if (members) {
        record = { ...record, members: members.members, quorum: members.quorum }
        save(record)
      }
    }

    const others = record.members.filter((member) => member.mailboxKey !== self.mailboxKey)
    const responses = new Map<string, string>()
    // Rebuilt from each mailbox's current proposal: one replaced by a newer
    // one drops out on its own.
    const inbox: Record<string, InboxItem> = {}
    const changesRequested = { ...record.changesRequested }
    for (const member of others) {
      await deps.op('followMailbox', { key: member.mailboxKey })
      const mailbox = await deps.op('readMailbox', { key: member.mailboxKey })
      const proposal = parseProposal(mailbox.proposal)
      if (proposal && !record.answered.includes(proposal.hash)) {
        inbox[proposal.hash] = { ...proposal, from: member.publisherId, mailboxKey: member.mailboxKey }
      }
      const mine = record.proposal
      if (mine) {
        const response = mailbox.approvals[mine.hash]?.response
        if (typeof response === 'string') responses.set(member.maintainerKey, response)
        const note = mailbox.changesRequested[mine.hash]?.note
        if (typeof note === 'string') changesRequested[member.publisherId] = note.slice(0, 2000)
      }
    }
    record = { ...record, changesRequested, inbox }
    save(record)

    // Enough approvals of ours (ours included): put it online.
    if (record.proposal && responses.size + 1 >= record.quorum && record.members.length >= 2) {
      const own = (await deps.op('readMailbox', { key: self.mailboxKey })).approvals[record.proposal.hash]?.response
      if (typeof own === 'string') await commit(record, [own, ...responses.values()])
      record = records()[publicId]
    }

    if (record.role === 'owner' && record.sharedKey && record.oldCode && record.courseId) {
      await deps.seedOldCode(record.courseId, record.oldCode).catch(() => {})
    }

    // The shared course is online: seed it; a new maintainer lands it here.
    if (record.members.length >= 2) {
      const seeded = await deps.op('seedShared', { spec: specOf(record) })
      if (record.sharedCourseKey !== seeded.sharedKey || (seeded.version && !record.sharedKey)) {
        record = { ...record, sharedCourseKey: seeded.sharedKey, sharedKey: seeded.version ? seeded.sharedKey : record.sharedKey }
        save(record)
      }
      if (seeded.courseId && seeded.version && !record.courseId) {
        await land(record, seeded.courseId)
      }
    }
  }

  async function commit(record: SharedCourseRecord, responses: string[]) {
    const proposal = record.proposal!
    const { sharedKey } = await deps.op('commit', {
      first: proposal.first,
      proposalKey: proposal.proposalKey,
      request: proposal.request,
      responses,
      spec: specOf(record),
    })
    if (proposal.first && record.role === 'owner' && record.courseId) {
      await deps.op('moveNotice', { courseId: record.courseId, publicId: record.publicId, sharedKey })
    }
    await deps.op('dropProposal', { proposalKey: proposal.proposalKey }).catch(() => {})
    save({ ...record, proposal: null, sharedKey })
    if (record.courseId) deps.onShared(record.courseId)
  }

  async function land(record: SharedCourseRecord, courseId: string) {
    if (await deps.courseOnDevice(courseId)) {
      save({ ...record, courseId })
      return
    }
    const stagingPath = await deps.createStagingPath()
    try {
      const downloaded = await deps.op('downloadShared', { spec: specOf(record), stagingPath })
      await deps.landCourse({ courseId: downloaded.courseId, stagingPath, version: downloaded.version })
      save({ ...records()[record.publicId], courseId: downloaded.courseId })
      deps.onShared(downloaded.courseId)
    } finally {
      await deps.removeStaging(stagingPath).catch(() => {})
    }
  }

  return {
    // The owner: a code that lets one person join as a maintainer.
    // `quorum`: how many must approve a version once they've joined.
    async invite(courseId: string, quorum: number): Promise<{ code: string }> {
      const published = await deps.publishedCourse(courseId)
      if (!published.publicId) throw new MaintainersError('NOT_PUBLISHED', 'Publish the course before inviting maintainers')
      const publicId = published.publicId
      return serial(publicId, async () => {
        const existing = records()[publicId]
        if (existing && existing.role !== 'owner') throw new MaintainersError('NOT_OWNER', 'Only the course owner invites')
        if (existing?.sharedKey) {
          throw new MaintainersError('ALREADY_SHARED', 'Adding maintainers to a shared course comes later')
        }
        const self = await deps.op('self', { publicId })
        save({
          answered: [],
          approvedAt: {},
          changesRequested: {},
          courseId,
          inbox: {},
          members: existing?.members ?? [self],
          nextProposalIndex: existing?.nextProposalIndex ?? 0,
          oldCode: published.code,
          ownerMailboxKey: null,
          proposal: null,
          publicId,
          quorum,
          role: 'owner',
          sharedKey: null,
        })
        return deps.op('createInvite', { publicId })
      })
    },

    // Someone joined with one of our codes.
    onJoined({ member, publicId }: { member: Member; publicId: string }): Promise<void> {
      return serial(publicId, async () => {
        const record = records()[publicId]
        if (!record || record.role !== 'owner' || record.sharedKey) return
        if (record.members.some((existing) => existing.publisherId === member.publisherId)) return
        const next = { ...record, members: [...record.members, member] }
        save(next)
        await writeMembers(next)
      })
    },

    // An invited maintainer: joins with the owner's code.
    async accept(code: string): Promise<{ publicId: string }> {
      const { ownerMailboxKey, publicId } = await deps.op('acceptInvite', { code })
      await serial(publicId, async () => {
        if (records()[publicId]) return
        save({
          answered: [],
          approvedAt: {},
          changesRequested: {},
          courseId: null,
          inbox: {},
          members: [],
          nextProposalIndex: 0,
          oldCode: null,
          ownerMailboxKey,
          proposal: null,
          publicId,
          quorum: 1,
          role: 'maintainer',
          sharedKey: null,
        })
      })
      await serial(publicId, () => refresh(publicId))
      return { publicId }
    },

    // The owner: proposes the course's current version as the shared
    // course's first, under the rule.
    async startSharing(courseId: string): Promise<SharedProposal> {
      const record = recordFor(courseId)
      if (!record || record.role !== 'owner') throw new MaintainersError('NOT_OWNER', 'Invite maintainers first')
      if (record.members.length < 2) throw new MaintainersError('NO_MAINTAINERS', 'Nobody has joined yet')
      assertRule(record.quorum, record.members.length)
      return serial(record.publicId, async () => {
        await writeMembers(record)
        return propose(record, { first: true })
      })
    },

    // A Publish of a shared course: proposes the newly published version
    // (unless it's already online or proposed); returns the shared code.
    // `propose: false` (the identity is locked) only shares it.
    async publishShared(courseId: string, { propose: canPropose = true } = {}): Promise<string> {
      const record = recordFor(courseId)
      if (!record?.sharedKey) throw new MaintainersError('NOT_SHARED', 'This course is not shared')
      return serial(record.publicId, async () => {
        const current = records()[record.publicId]
        const seeded = await deps.op('seedShared', { spec: specOf(current) })
        const published = await deps.publishedCourse(courseId)
        const isNewer =
          published.version &&
          (!seeded.version ||
            compareCourseVersions(parseCourseVersion(published.version), parseCourseVersion(seeded.version)) > 0)
        if (canPropose && isNewer && current.proposal?.version !== published.version) {
          await propose(current, { first: false })
        }
        return seeded.sharedKey
      })
    },

    isShared(courseId: string): boolean {
      return Boolean(recordFor(courseId)?.sharedKey)
    },

    // A mailbox or shared course changed: refresh the courses it belongs to.
    onDriveChanged(driveKey: string): void {
      for (const record of Object.values(records())) {
        const involved =
          record.ownerMailboxKey === driveKey ||
          record.sharedKey === driveKey ||
          record.sharedCourseKey === driveKey ||
          record.members.some((member) => member.mailboxKey === driveKey)
        if (involved) void serial(record.publicId, () => refresh(record.publicId)).catch(logFailure(record.publicId))
      }
    },

    async start(): Promise<void> {
      for (const publicId of Object.keys(records())) {
        await serial(publicId, () => refresh(publicId)).catch(logFailure(publicId))
      }
    },

    refresh: (publicId: string) => serial(publicId, () => refresh(publicId)),

    // What the course's maintainer panel shows.
    getInfo(courseId: string) {
      const record = recordFor(courseId)
      if (!record) return null
      return {
        changesRequested: record.changesRequested,
        members: record.members.map((member) => ({ publisherId: member.publisherId })),
        proposal: record.proposal ? { version: record.proposal.version } : null,
        quorum: record.quorum,
        role: record.role,
        sharedKey: record.sharedKey,
      }
    },

    // Proposals waiting for this maintainer's review, every course.
    listApprovals() {
      return Object.values(records()).flatMap((record) =>
        Object.values(record.inbox).map((item) => ({
          courseId: record.courseId,
          from: item.from,
          hash: item.hash,
          publicId: record.publicId,
          version: item.version,
        })),
      )
    },

    // What a proposal changes (for its review page).
    async review(publicId: string, hash: string): Promise<{ changes: ProposalChange[]; version: string }> {
      const record = records()[publicId]
      const item = record?.inbox[hash]
      if (!record || !item) throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
      const { changes } = await deps.op('review', { proposalKey: item.proposalKey, request: item.request, spec: specOf(record) })
      return { changes, version: item.version }
    },

    // Approves a proposal: checked again first (it must build on the
    // course's latest version), and never a second one for the same spot.
    approve(publicId: string, hash: string): Promise<void> {
      return serial(publicId, async () => {
        const record = records()[publicId]
        const item = record?.inbox[hash]
        if (!record || !item) throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
        const spec = specOf(record)
        const { sharedLength } = await deps.op('review', { proposalKey: item.proposalKey, request: item.request, spec })
        const spot = String(sharedLength)
        const earlier = record.approvedAt[spot]
        if (earlier && earlier !== hash) {
          throw new MaintainersError('ALREADY_APPROVED', 'You already approved another version for this spot')
        }
        const { response } = await deps.op('sign', { request: item.request, spec })
        await deps.op('writeMailbox', { file: `/approvals/${hash}.json`, publicId, value: { response } })
        const inbox = { ...record.inbox }
        delete inbox[hash]
        save({ ...record, answered: [...record.answered, hash], approvedAt: { ...record.approvedAt, [spot]: hash }, inbox })
      })
    },

    // Asks for changes instead of approving, with a note to the proposer.
    requestChanges(publicId: string, hash: string, note: string): Promise<void> {
      return serial(publicId, async () => {
        const record = records()[publicId]
        if (!record?.inbox[hash]) throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
        await deps.op('writeMailbox', {
          file: `/changes-requested/${hash}.json`,
          publicId,
          value: { note: note.slice(0, 2000) },
        })
        const inbox = { ...record.inbox }
        delete inbox[hash]
        save({ ...record, answered: [...record.answered, hash], inbox })
      })
    },
  }
}

function logFailure(publicId: string) {
  return (error: unknown) => console.error(`[maintainers] ${publicId} failed:`, error)
}

function parseMembers(value: unknown, publicId: string): { members: Member[]; quorum: number } | null {
  const data = value as { members?: unknown; publicId?: unknown; quorum?: unknown } | null
  if (!data || data.publicId !== publicId || !Array.isArray(data.members) || typeof data.quorum !== 'number') return null
  const members = data.members.filter(
    (member): member is Member =>
      Boolean(member) &&
      typeof member.mailboxKey === 'string' &&
      typeof member.maintainerKey === 'string' &&
      typeof member.publisherId === 'string',
  )
  if (members.length !== data.members.length || members.length === 0) return null
  return { members, quorum: data.quorum }
}

function parseProposal(value: unknown): Omit<InboxItem, 'from' | 'mailboxKey'> | null {
  const data = value as Partial<SharedProposal> | null
  if (
    !data ||
    typeof data.hash !== 'string' ||
    typeof data.proposalKey !== 'string' ||
    typeof data.request !== 'string' ||
    typeof data.version !== 'string'
  ) {
    return null
  }
  return { hash: data.hash, proposalKey: data.proposalKey, request: data.request, version: data.version }
}

export type MaintainersService = ReturnType<typeof createMaintainers>
