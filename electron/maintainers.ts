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

import type { CourseChangelogEntry } from '../src/lib/course-package'
import type { ApprovalGroup, ApprovalItem } from '../src/lib/maintainers'
import { compareCourseVersions, isCourseVersion, parseCourseVersion } from '../src/lib/course-versioning'
import type { MaintainerSelf, MailboxContents, ProposalChange, SharedCourseSpecInput } from './bare-worker'

export type Member = MaintainerSelf

export type SharedProposal = {
  first: boolean
  // The course's title in its default language, for others' approval lists
  // (the course may not be on their computer yet).
  title?: string
  hash: string
  proposalKey: string
  request: string
  version: string
}

// A proposal of this course, anyone's, as this app knows it (SLJ-109): the
// Approvals page lists them, waiting and decided, so its history stays.
export type ProposalRecord = {
  // Publisher ids of the maintainers who approved it (its proposer too).
  approvedBy: string[]
  // Notes asking for changes, by publisher id.
  changesRequested: Record<string, string>
  // When it went online or was replaced (ms), null while waiting.
  decidedAt: number | null
  // Its proposer's publisher id and mailbox.
  from: string
  hash: string
  mailboxKey: string
  // Proposed from this app.
  mine: boolean
  proposalKey: string
  // When this app first saw it (ms).
  proposedAt: number
  request: string
  // 'online': the shared course holds exactly it; 'replaced': another version
  // took its spot, or its proposer proposed a newer one.
  state: 'online' | 'replaced' | 'waiting'
  title?: string
  version: string
}

export type SharedCourseRecord = {
  // The course's own id on this device: the owner's from the start, an
  // invited maintainer's once the shared course has landed here.
  courseId: string | null
  // Proposals this maintainer answered (approved, or asked to change), by
  // request hash: they no longer wait for us.
  answered: string[]
  // Each maintainer approves at most one version per spot (the shared
  // course's length it builds on): spot -> request hash.
  approvedAt: Record<string, string>
  // Notes asking for changes to our proposal, by publisher id.
  changesRequested: Record<string, string>
  // Every proposal seen, by request hash; decided ones capped at
  // MAX_DECIDED_PROPOSALS. Missing in stores written before SLJ-109.
  proposals?: Record<string, ProposalRecord>
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
  createInvite: [{ invitee: string; publicId: string }, { code: string }]
  downloadShared: [{ spec: SharedCourseSpecInput; stagingPath: string }, { courseId: string; version: string }]
  downloadProposal: [{ length: number; proposalKey: string; stagingPath: string }, { courseId: string; version: string }]
  dropProposal: [{ proposalKey: string }, unknown]
  followMailbox: [{ key: string }, unknown]
  moveNotice: [{ courseId: string; publicId: string; sharedKey: string }, unknown]
  propose: [
    { index: number; source: unknown; spec: SharedCourseSpecInput; versionPath: string },
    { hash: string; length: number; proposalKey: string; request: string },
  ]
  readMailbox: [{ key: string }, MailboxContents]
  proposalState: [{ request: string; spec: SharedCourseSpecInput }, { state: 'online' | 'replaced' | 'waiting' }]
  readSharedSource: [
    { sharedKey: string },
    { courseId: string | null; source: unknown; title: string | null; version: string | null },
  ]
  review: [
    { proposalKey: string; request: string; spec: SharedCourseSpecInput },
    { changelog: unknown[]; changes: ProposalChange[]; length: number; sharedLength: number },
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
    title?: string
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
  setInterval?: (callback: () => void, delayMs: number) => { cancel(): void }
  // "Preview as student" (SLJ-67): an empty folder for a proposal's files,
  // holding a hardlinked copy of `basePath` (the version this device has)
  // when there is one, so only changed files are downloaded.
  createPreviewPath(hash: string, basePath: string | null): Promise<string>
  // The clock, for the history's dates (tests set it).
  now?: () => number
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

// Every shared course is read again this often, besides on every change: a
// read that timed out (a mailbox whose data hadn't arrived yet) would
// otherwise wait for a change that may never come.
const REFRESH_INTERVAL_MS = 20_000

function defaultSetInterval(callback: () => void, delayMs: number) {
  const timer = setInterval(callback, delayMs)
  return { cancel: () => clearInterval(timer) }
}

export function createMaintainers(deps: MaintainersDeps) {
  // One refresh at a time per course: events arrive in bursts.
  const queues = new Map<string, Promise<unknown>>()
  let periodic: { cancel(): void } | null = null
  const pending = new Set<string>()
  const now = deps.now ?? Date.now

  function serial<T>(publicId: string, run: () => Promise<T>): Promise<T> {
    const previous = queues.get(publicId) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(run)
    queues.set(publicId, next)
    return next
  }

  // Every course read again every REFRESH_INTERVAL_MS (one at a time per
  // course: skipped while the last one is still waiting).
  function startPeriodicRefresh() {
    periodic ??= (deps.setInterval ?? defaultSetInterval)(() => {
      for (const publicId of Object.keys(records())) {
        if (pending.has(publicId)) continue
        pending.add(publicId)
        void serial(publicId, () => refresh(publicId))
          .catch(logFailure(publicId))
          .finally(() => pending.delete(publicId))
      }
    }, REFRESH_INTERVAL_MS)
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
        // Mailbox keys too, so restoring on a new computer can reach the others.
        members: record.members.map(({ mailboxKey, maintainerKey, publisherId }) => ({ mailboxKey, maintainerKey, publisherId })),
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
    // By time, not a counter kept here: after a restore on a new computer, a
    // counter would start over and reuse a proposal drive the old computer
    // already wrote to.
    const index = Math.max(record.nextProposalIndex, Date.now())
    const { hash, proposalKey, request } = await deps.op('propose', {
      index,
      source: sourceFor(record, sharedKey),
      spec,
      versionPath: published.versionPath,
    })
    if (record.proposal) await deps.op('dropProposal', { proposalKey: record.proposal.proposalKey }).catch(() => {})

    const proposal: SharedProposal = {
      first,
      hash,
      proposalKey,
      request,
      title: published.title?.slice(0, 200),
      version: published.version,
    }
    // The proposer approves their own proposal too.
    const { response } = await deps.op('sign', { request, spec })
    await deps.op('writeMailbox', { file: '/proposal.json', publicId: record.publicId, value: proposal })
    await deps.op('writeMailbox', { file: `/approvals/${hash}.json`, publicId: record.publicId, value: { response } })
    const self = await deps.op('self', { publicId: record.publicId })
    const proposals = { ...(record.proposals ?? {}) }
    const previous = record.proposal && proposals[record.proposal.hash]
    if (previous?.state === 'waiting') proposals[previous.hash] = { ...previous, decidedAt: now(), state: 'replaced' }
    proposals[hash] = {
      approvedBy: [self.publisherId],
      changesRequested: {},
      decidedAt: null,
      from: self.publisherId,
      hash,
      mailboxKey: self.mailboxKey,
      mine: true,
      proposalKey,
      proposedAt: now(),
      request,
      state: 'waiting',
      title: proposal.title,
      version: proposal.version,
    }
    save({ ...record, changesRequested: {}, nextProposalIndex: index + 1, proposal, proposals: capHistory(proposals) })
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

    const responses = new Map<string, string>()
    const changesRequested = { ...record.changesRequested }
    const proposals = { ...(record.proposals ?? {}) }
    // Each mailbox's current proposal, by mailbox: an older one of the same
    // proposer still waiting was replaced by it.
    const current = new Map<string, string>()
    let ownMailbox: MailboxContents | null = null
    for (const member of record.members) {
      const isSelf = member.mailboxKey === self.mailboxKey
      if (!isSelf) await deps.op('followMailbox', { key: member.mailboxKey })
      const mailbox = await deps.op('readMailbox', { key: member.mailboxKey })
      if (isSelf) ownMailbox = mailbox
      const proposal = parseProposal(mailbox.proposal)
      if (proposal) {
        current.set(member.mailboxKey, proposal.hash)
        proposals[proposal.hash] ??= {
          ...proposal,
          approvedBy: [],
          changesRequested: {},
          decidedAt: null,
          from: member.publisherId,
          mailboxKey: member.mailboxKey,
          mine: isSelf,
          proposedAt: now(),
          state: 'waiting',
        }
      }
      // Who approved or asked for changes, for every proposal still waiting.
      for (const entry of Object.values(proposals)) {
        if (entry.state !== 'waiting') continue
        const approved = typeof mailbox.approvals[entry.hash]?.response === 'string'
        const note = mailbox.changesRequested[entry.hash]?.note
        proposals[entry.hash] = {
          ...entry,
          approvedBy: approved && !entry.approvedBy.includes(member.publisherId) ? [...entry.approvedBy, member.publisherId] : entry.approvedBy,
          changesRequested:
            typeof note === 'string' ? { ...entry.changesRequested, [member.publisherId]: note.slice(0, 2000) } : entry.changesRequested,
        }
      }
      const mine = record.proposal
      if (mine && !isSelf) {
        const response = mailbox.approvals[mine.hash]?.response
        if (typeof response === 'string') responses.set(member.maintainerKey, response)
        const note = mailbox.changesRequested[mine.hash]?.note
        if (typeof note === 'string') changesRequested[member.publisherId] = note.slice(0, 2000)
      }
    }
    // Where each waiting proposal stands against the shared course: online
    // once it holds exactly it (whoever committed it), replaced once another
    // version took its spot or its proposer proposed a newer one.
    for (const entry of Object.values(proposals)) {
      if (entry.state !== 'waiting' || record.members.length < 2) continue
      const state = await deps
        .op('proposalState', { request: entry.request, spec: specOf(record) })
        .then((result) => result.state)
        .catch(() => 'waiting' as const)
      const superseded = current.has(entry.mailboxKey) && current.get(entry.mailboxKey) !== entry.hash
      const next = state === 'waiting' && superseded ? 'replaced' : state
      if (next !== 'waiting') proposals[entry.hash] = { ...entry, decidedAt: now(), state: next }
    }
    record = { ...record, changesRequested, proposals: capHistory(proposals) }
    save(record)
    if (ownMailbox) record = await recoverOwnAnswers(record, self, ownMailbox)

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
    const proposals = { ...(record.proposals ?? {}) }
    const entry = proposals[proposal.hash]
    if (entry) proposals[proposal.hash] = { ...entry, decidedAt: now(), state: 'online' }
    save({ ...record, proposal: null, proposals, sharedKey })
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

  // What this maintainer answered, as their own mailbox says: on a new
  // computer (restored identity, SLJ-54) the record starts without it. Without
  // `approvedAt` back, the app could approve a second version for a spot it
  // already approved one for on the old computer, and two versions could
  // both reach the rule (a fork). Only adds, never forgets (a read that timed
  // out comes back empty).
  // - Answered: every proposal with an approval or a change request there.
  // - Spots: written with each approval since SLJ-109. For an older approval
  //   without one, of someone else's proposal still waiting, the proposal is
  //   checked again (its spot is the shared course's length it builds on);
  //   one that no longer builds on the latest version has lost its spot
  //   anyway. Our own proposals' approvals carry no spot: proposing isn't
  //   approving someone else's version.
  async function recoverOwnAnswers(
    record: SharedCourseRecord | undefined,
    self: MaintainerSelf,
    ownMailbox?: MailboxContents,
  ): Promise<SharedCourseRecord> {
    if (!record) throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
    const mailbox = ownMailbox ?? (await deps.op('readMailbox', { key: self.mailboxKey }))
    const answered = new Set(record.answered)
    const approvedAt = { ...record.approvedAt }
    const spotted = new Set(Object.values(approvedAt))
    for (const hash of [...Object.keys(mailbox.approvals), ...Object.keys(mailbox.changesRequested)]) answered.add(hash)
    for (const [hash, approval] of Object.entries(mailbox.approvals)) {
      if (spotted.has(hash)) continue
      let spot: number | null = Number.isInteger(approval?.spot) ? (approval.spot as number) : null
      const entry = record.proposals?.[hash]
      if (spot === null && entry && !entry.mine && entry.state === 'waiting') {
        spot = await deps
          .op('review', { proposalKey: entry.proposalKey, request: entry.request, spec: specOf(record) })
          .then((review) => review.sharedLength)
          .catch(() => null)
      }
      if (spot === null) continue
      approvedAt[String(spot)] ??= hash
      spotted.add(hash)
    }
    const changed = answered.size !== record.answered.length || Object.keys(approvedAt).length !== Object.keys(record.approvedAt).length
    if (!changed) return record
    const next = { ...(records()[record.publicId] ?? record), answered: [...answered], approvedAt }
    save(next)
    return next
  }

  // Someone else's proposal, still waiting: its files can be reviewed and
  // previewed (ours is open in the worker as our own drive).
  function reviewable(record: SharedCourseRecord | undefined, hash: string): ProposalRecord {
    const entry = record?.proposals?.[hash]
    if (!record || !entry || entry.mine || entry.state !== 'waiting') {
      throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
    }
    return entry
  }

  // ...and not answered by us yet.
  function answerable(record: SharedCourseRecord | undefined, hash: string): ProposalRecord {
    const entry = reviewable(record, hash)
    if (record!.answered.includes(hash)) throw new MaintainersError('ANSWERED', 'You already answered this proposal')
    return entry
  }

  function markReplaced(record: SharedCourseRecord, hash: string) {
    const latest = records()[record.publicId] ?? record
    const entry = latest.proposals?.[hash]
    if (!entry || entry.state !== 'waiting') return
    save({ ...latest, proposals: { ...latest.proposals, [hash]: { ...entry, decidedAt: now(), state: 'replaced' } } })
  }

  return {
    // The owner: a code that lets one person join as a maintainer: the
    // publisher `invitee` (their publisher id), who proves it when joining
    // (SLJ-67). The rule (how many must approve) is chosen when sharing starts.
    async invite(courseId: string, invitee: string): Promise<{ code: string }> {
      const published = await deps.publishedCourse(courseId)
      if (!published.publicId) throw new MaintainersError('NOT_PUBLISHED', 'Publish the course before inviting maintainers')
      const publicId = published.publicId
      return serial(publicId, async () => {
        const existing = records()[publicId]
        if (existing && existing.role !== 'owner') throw new MaintainersError('NOT_OWNER', 'Only the course owner invites')
        const self = await deps.op('self', { publicId })
        // Already shared: the code lets a maintainer back in on a new
        // computer (adding new maintainers to a shared course comes later).
        if (!existing) {
          save({
            answered: [],
            approvedAt: {},
            changesRequested: {},
            courseId,
            proposals: {},
            members: [self],
            nextProposalIndex: 0,
            oldCode: published.code,
            ownerMailboxKey: null,
            proposal: null,
            publicId,
            quorum: 1,
            role: 'owner',
            sharedKey: null,
          })
        }
        return deps.op('createInvite', { invitee, publicId })
      })
    },

    // Someone joined with one of our codes.
    onJoined({ member, publicId }: { member: Member; publicId: string }): Promise<void> {
      return serial(publicId, async () => {
        const record = records()[publicId]
        if (!record || record.role !== 'owner') return
        // A maintainer back on a new computer: same keys, nothing to change.
        if (record.members.some((existing) => existing.publisherId === member.publisherId)) return
        if (record.sharedKey) {
          console.warn(`[maintainers] ${publicId}: adding maintainers to a shared course isn't supported yet`)
          return
        }
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
          proposals: {},
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
      // The owner's mailbox is read in the background: its data may take a
      // moment to arrive, and every change to it is read again anyway.
      void serial(publicId, () => refresh(publicId)).catch(logFailure(publicId))
      // Read again every so often until the course lands.
      startPeriodicRefresh()
      return { publicId }
    },

    // The owner: proposes the course's current version as the shared
    // course's first, under the rule (`quorum`: how many must approve).
    async startSharing(courseId: string, quorum: number): Promise<SharedProposal> {
      const found = recordFor(courseId)
      if (!found || found.role !== 'owner') throw new MaintainersError('NOT_OWNER', 'Invite maintainers first')
      if (found.members.length < 2) throw new MaintainersError('NO_MAINTAINERS', 'Nobody has joined yet')
      if (found.sharedKey) throw new MaintainersError('ALREADY_SHARED', 'This course is shared already')
      assertRule(quorum, found.members.length)
      return serial(found.publicId, async () => {
        const record = { ...records()[found.publicId], quorum }
        save(record)
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

    // Restoring the identity on a new computer (SLJ-54): the owner's course
    // moved to a shared one. Takes up maintaining it again from what the
    // shared course says (its maintainers, with their mailboxes, and the
    // rule), and lands its latest version here.
    async restoreSharedCourse(input: { oldCode: string; publicId: string; sharedKey: string }): Promise<{
      courseId: string
      title: string
    }> {
      return serial(input.publicId, async () => {
        const shared = await deps.op('readSharedSource', { sharedKey: input.sharedKey })
        const parsed = parseSharedSource(shared.source)
        if (!parsed || !shared.courseId) throw new MaintainersError('NOT_SHARED', "This shared course can't be read")
        const self = await deps.op('self', { publicId: input.publicId })
        const role = parsed.ownerPublisherId === self.publisherId ? 'owner' : 'maintainer'
        const record: SharedCourseRecord = {
          answered: [],
          approvedAt: {},
          changesRequested: {},
          courseId: null,
          proposals: {},
          members: parsed.members,
          nextProposalIndex: 0,
          oldCode: role === 'owner' ? input.oldCode : null,
          ownerMailboxKey: role === 'owner' ? null : parsed.members[0].mailboxKey,
          proposal: null,
          publicId: input.publicId,
          quorum: parsed.quorum,
          role,
          sharedCourseKey: input.sharedKey,
          sharedKey: input.sharedKey,
        }
        save(record)
        // The owner says again who maintains it and the rule, in her mailbox
        // (continued from its history, never forked: maintainers.cjs), for
        // maintainers who join again from a new computer.
        if (role === 'owner') await writeMembers(record)
        await land(record, shared.courseId)
        return { courseId: shared.courseId, title: shared.title ?? '' }
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
      startPeriodicRefresh()
      for (const publicId of Object.keys(records())) {
        await serial(publicId, () => refresh(publicId)).catch(logFailure(publicId))
      }
    },

    // The profile is closing.
    stop(): void {
      periodic?.cancel()
      periodic = null
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

    // Every course's proposals, waiting and decided, in the Approvals page's
    // groups (SLJ-109); `maintained`: how many shared courses this profile
    // maintains (the sidebar shows Approvals once there is one).
    listApprovals(): { items: ApprovalItem[]; maintained: number } {
      const courses = Object.values(records()).filter((record) => record.members.length >= 2)
      const items = courses.flatMap((record) =>
        Object.values(record.proposals ?? {}).map((entry): ApprovalItem => ({
          approvedBy: entry.approvedBy,
          changesRequested: Object.entries(entry.changesRequested).map(([publisherId, note]) => ({ note, publisherId })),
          courseId: record.courseId,
          decidedAt: entry.decidedAt,
          from: entry.from,
          group: groupOf(record, entry),
          hash: entry.hash,
          mine: entry.mine,
          // Who hasn't approved yet, while it waits.
          missing:
            entry.state === 'waiting'
              ? record.members.map((member) => member.publisherId).filter((id) => !entry.approvedBy.includes(id))
              : [],
          proposedAt: entry.proposedAt,
          publicId: record.publicId,
          quorum: record.quorum,
          title: entry.title ?? null,
          version: entry.version,
        })),
      )
      return { items, maintained: courses.length }
    },

    // What a proposal changes (for its review page): its release notes since
    // the version online now (the author's notes and the changes in course
    // terms, as its cut wrote them), and the files it changes, the check.
    async review(
      publicId: string,
      hash: string,
    ): Promise<{ changes: ProposalChange[]; releaseNotes: CourseChangelogEntry[]; version: string }> {
      const record = records()[publicId]
      const item = reviewable(record, hash)
      const spec = specOf(record)
      const { changelog, changes } = await deps.op('review', { proposalKey: item.proposalKey, request: item.request, spec })
      const { version: onlineVersion } = await deps.op('seedShared', { spec })
      // The version's bookkeeping (its file hashes, its release notes'
      // history) isn't something to review.
      const content = changes.filter((change) => !BOOKKEEPING_FILES.has(change.path))
      return {
        changes: content,
        releaseNotes: notesSince(Array.isArray(changelog) ? changelog : [], onlineVersion, item.version),
        version: item.version,
      }
    },

    // "Preview as student" (SLJ-67): the proposed version's files on this
    // device, in a folder of their own. Returns where, and its course id.
    async preview(publicId: string, hash: string): Promise<{ courseId: string; path: string; version: string }> {
      const record = records()[publicId]
      const item = reviewable(record, hash)
      const spec = specOf(record)
      const { length } = await deps.op('review', { proposalKey: item.proposalKey, request: item.request, spec })
      const base = record.courseId ? (await deps.publishedCourse(record.courseId)).versionPath : null
      const stagingPath = await deps.createPreviewPath(hash, base)
      const downloaded = await deps.op('downloadProposal', { length, proposalKey: item.proposalKey, stagingPath })
      return { courseId: downloaded.courseId, path: stagingPath, version: downloaded.version }
    },

    // Approves a proposal: checked again first (it must build on the
    // course's latest version), and never a second one for the same spot.
    approve(publicId: string, hash: string): Promise<void> {
      return serial(publicId, async () => {
        const self = await deps.op('self', { publicId })
        // What this maintainer answered on another computer counts too.
        const record = await recoverOwnAnswers(records()[publicId], self)
        const item = answerable(record, hash)
        const spec = specOf(record)
        const { sharedLength } = await deps
          .op('review', { proposalKey: item.proposalKey, request: item.request, spec })
          .catch((error) => {
            // Another version took its spot meanwhile.
            if ((error as { code?: unknown })?.code === 'NOT_LATEST' || /latest version/.test(String(error))) markReplaced(record, hash)
            throw error
          })
        const spot = String(sharedLength)
        const earlier = record.approvedAt[spot]
        if (earlier && earlier !== hash) {
          throw new MaintainersError('ALREADY_APPROVED', 'You already approved another version for this spot')
        }
        const { response } = await deps.op('sign', { request: item.request, spec })
        // The spot goes along, so a new computer knows it too (recoverOwnAnswers).
        await deps.op('writeMailbox', { file: `/approvals/${hash}.json`, publicId, value: { response, spot: sharedLength } })
        const proposals = { ...(record.proposals ?? {}) }
        proposals[hash] = { ...item, approvedBy: [...new Set([...item.approvedBy, self.publisherId])] }
        save({ ...record, answered: [...record.answered, hash], approvedAt: { ...record.approvedAt, [spot]: hash }, proposals })
      })
    },

    // Asks for changes instead of approving, with a note to the proposer.
    requestChanges(publicId: string, hash: string, note: string): Promise<void> {
      return serial(publicId, async () => {
        const self = await deps.op('self', { publicId })
        const record = await recoverOwnAnswers(records()[publicId], self)
        const item = answerable(record, hash)
        await deps.op('writeMailbox', {
          file: `/changes-requested/${hash}.json`,
          publicId,
          value: { note: note.slice(0, 2000) },
        })
        const proposals = { ...(record.proposals ?? {}) }
        proposals[hash] = { ...item, changesRequested: { ...item.changesRequested, [self.publisherId]: note.slice(0, 2000) } }
        save({ ...record, answered: [...record.answered, hash], proposals })
      })
    },
  }
}

const BOOKKEEPING_FILES = new Set(['/version-meta.json', '/changelog.json'])

// Which group of the Approvals page a proposal is in.
function groupOf(record: SharedCourseRecord, entry: ProposalRecord): ApprovalGroup {
  if (entry.state === 'online') return 'approved'
  if (entry.state === 'replaced') return 'replaced'
  if (!entry.mine && !record.answered.includes(entry.hash)) return 'waiting-for-you'
  return Object.keys(entry.changesRequested).length > 0 ? 'changes-requested' : 'waiting-for-others'
}

// Decided proposals kept per course (waiting ones are always kept).
export const MAX_DECIDED_PROPOSALS = 100

function capHistory(proposals: Record<string, ProposalRecord>): Record<string, ProposalRecord> {
  const decided = Object.values(proposals)
    .filter((entry) => entry.state !== 'waiting')
    .sort((left, right) => (right.decidedAt ?? 0) - (left.decidedAt ?? 0))
  if (decided.length <= MAX_DECIDED_PROPOSALS) return proposals
  const dropped = new Set(decided.slice(MAX_DECIDED_PROPOSALS).map((entry) => entry.hash))
  return Object.fromEntries(Object.entries(proposals).filter(([hash]) => !dropped.has(hash)))
}

// The changelog entries a proposal adds: newer than the version online now (all
// of them for a first version), up to the proposed one, newest first. Remote
// data: only well-formed entries, texts capped.
export function notesSince(changelog: unknown[], onlineVersion: string | null, proposedVersion: string): CourseChangelogEntry[] {
  const newer = (version: string, than: string) =>
    compareCourseVersions(parseCourseVersion(version), parseCourseVersion(than)) > 0
  return changelog
    .filter((entry): entry is CourseChangelogEntry => {
      const candidate = entry as Partial<CourseChangelogEntry> | null
      return (
        Boolean(candidate) &&
        isCourseVersion(candidate?.version) &&
        Array.isArray(candidate?.changes) &&
        (candidate.notes === undefined || typeof candidate.notes === 'string')
      )
    })
    .filter(
      (entry) =>
        isCourseVersion(proposedVersion) &&
        !newer(entry.version, proposedVersion) &&
        (!onlineVersion || !isCourseVersion(onlineVersion) || newer(entry.version, onlineVersion)),
    )
    .map((entry) => ({ ...entry, notes: entry.notes?.slice(0, 5000) }))
    .sort((left, right) => compareCourseVersions(parseCourseVersion(right.version), parseCourseVersion(left.version)))
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

// The shared course's source.json: its owner, maintainers (with mailboxes)
// and rule.
function parseSharedSource(value: unknown): { members: Member[]; ownerPublisherId: string; quorum: number } | null {
  const data = value as { maintainers?: { members?: unknown; quorum?: unknown }; publisher?: { id?: unknown } } | null
  const members = data?.maintainers?.members
  const quorum = data?.maintainers?.quorum
  const owner = data?.publisher?.id
  if (!Array.isArray(members) || typeof quorum !== 'number' || typeof owner !== 'string') return null
  const parsed = members.filter(
    (member): member is Member =>
      Boolean(member) &&
      typeof member.mailboxKey === 'string' &&
      typeof member.maintainerKey === 'string' &&
      typeof member.publisherId === 'string',
  )
  return parsed.length === members.length && parsed.length > 0 ? { members: parsed, ownerPublisherId: owner, quorum } : null
}

function parseProposal(value: unknown): Pick<ProposalRecord, 'hash' | 'proposalKey' | 'request' | 'title' | 'version'> | null {
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
  return {
    hash: data.hash,
    proposalKey: data.proposalKey,
    request: data.request,
    title: typeof data.title === 'string' ? data.title.slice(0, 200) : undefined,
    version: data.version,
  }
}

export type MaintainersService = ReturnType<typeof createMaintainers>
