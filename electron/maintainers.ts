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
import { normalizePublisherName } from '../src/lib/publishers'
import type { MaintainerSelf, MailboxContents, ProposalChange, SharedCourseSpecInput } from './bare-worker'

export type Member = MaintainerSelf

// A change of the course's maintainers or rule (SLJ-70): another move, to
// the next generation's shared course (a new code). Its proposal carries two
// requests: the moved notice for the current shared course (the proposal's
// own `request`, approved under the current rule), and `next`, the new shared
// course's first version (approved under the new rule, by the new
// maintainers). The owner commits both once each rule is met.
export type MaintainersChange = {
  generation: number
  members: Member[]
  next: { hash: string; proposalKey: string; request: string }
  quorum: number
}

export type SharedProposal = {
  change?: MaintainersChange
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
  // A change of maintainers (SLJ-70): who of the new ones approved the next
  // shared course's first version.
  approvedNextBy?: string[]
  change?: MaintainersChange
  // Notes asking for changes, by publisher id.
  changesRequested: Record<string, string>
  // When it went online or was replaced (ms), null while waiting.
  decidedAt: number | null
  // Its proposer's publisher id and mailbox.
  from: string
  hash: string
  mailboxKey: string
  // The shared course's generation it's for (SLJ-70; 0 when unset).
  generation?: number
  // Proposed from this app.
  mine: boolean
  proposalKey: string
  // When this app first saw it (ms).
  proposedAt: number
  // Ours and over: its drive's copy of the course's history was deleted
  // (SLJ-111).
  cleared?: boolean
  request: string
  // 'online': the shared course holds exactly it; 'replaced': another version
  // took its spot, or its proposer proposed a newer one; 'withdrawn': its
  // proposer withdrew it (SLJ-110).
  state: 'online' | 'replaced' | 'waiting' | 'withdrawn'
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
  // course's length it builds on): spotKey -> request hash.
  approvedAt: Record<string, string>
  // Notes asking for changes to our proposal, by publisher id.
  changesRequested: Record<string, string>
  // Every proposal seen, by request hash; decided ones capped at
  // MAX_DECIDED_PROPOSALS. Missing in stores written before SLJ-109.
  proposals?: Record<string, ProposalRecord>
  // How many times the maintainers or the rule changed (SLJ-70): the shared
  // course's generation. 0 when unset.
  generation?: number
  // Maintainers, the owner first. Ours as the owner wrote them.
  members: Member[]
  // Each maintainer's Publisher name, by publisher id, as their mailbox says
  // (ours as Settings says): carried by the shared course's source.json.
  names?: Record<string, string>
  nextProposalIndex: number
  // The owner's: the course's code before it moved (kept shared).
  oldCode: string | null
  // A maintainer's: whose /members.json to read.
  ownerMailboxKey: string | null
  // The owner's: who joined with an invite since the course is shared, and
  // becomes a maintainer once a change adding them is approved (SLJ-70).
  pending?: Member[]
  // Earlier generations' shared courses (SLJ-70), kept shared: students
  // still on them find the "moved" notice there.
  previous?: { generation: number; members: Member[]; quorum: number }[]
  // This maintainer was removed by a change (SLJ-70): the course stays on
  // this device, no longer maintained together.
  removed?: boolean
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
  openProposal: [{ proposalKey: string }, { opened: boolean }]
  followMailbox: [{ key: string }, unknown]
  moveNotice: [{ courseId: string; publicId: string; sharedKey: string }, unknown]
  propose: [
    { index: number; source: unknown; spec: SharedCourseSpecInput; versionPath: string },
    { hash: string; length: number; proposalKey: string; request: string; sharedLength: number },
  ]
  readMailbox: [{ key: string }, MailboxContents]
  proposalState: [{ request: string; spec: SharedCourseSpecInput }, { state: 'online' | 'replaced' | 'waiting' }]
  readSharedSource: [
    { sharedKey: string },
    { courseId: string | null; movedTo: string | null; source: unknown; title: string | null; version: string | null },
  ]
  review: [
    { proposalKey: string; request: string; spec: SharedCourseSpecInput },
    { changelog: unknown[]; changes: ProposalChange[]; length: number; sharedLength: number },
  ]
  seedShared: [
    { spec: SharedCourseSpecInput },
    { courseId: string | null; length: number; sharedKey: string; version: string | null },
  ]
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
  // This teacher's Publisher name ("" for none): put in their mailbox for the
  // other maintainers, and into the shared course's source.json.
  ownPublisherName?: () => string | Promise<string>
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
    return specFor(record.publicId, record.generation ?? 0, record.members, record.quorum)
  }

  // The spec of generation `generation` of the course, current or earlier.
  function specAt(record: SharedCourseRecord, generation: number): SharedCourseSpecInput | null {
    if (generation === (record.generation ?? 0)) return specOf(record)
    const earlier = record.previous?.find((entry) => entry.generation === generation)
    return earlier ? specFor(record.publicId, generation, earlier.members, earlier.quorum) : null
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
      value: {
        generation: record.generation ?? 0,
        members: record.members,
        pending: record.pending ?? [],
        publicId: record.publicId,
        quorum: record.quorum,
      },
    })
  }

  // The shared course's source.json: where it's shared from, the original
  // publisher (so students' update checks still pass), and its maintainers,
  // each with their Publisher name if they gave one (students see them all).
  function sourceFor(
    record: Pick<SharedCourseRecord, 'generation' | 'members' | 'names' | 'publicId' | 'quorum'>,
    sharedKey: string,
  ) {
    const named = (publisherId: string) => (record.names?.[publisherId] ? { name: record.names[publisherId] } : {})
    return {
      driveKey: sharedKey,
      maintainers: {
        generation: record.generation ?? 0,
        // Mailbox keys too, so restoring on a new computer can reach the others.
        members: record.members.map(({ mailboxKey, maintainerKey, publisherId }) => ({
          mailboxKey,
          maintainerKey,
          publisherId,
          ...named(publisherId),
        })),
        quorum: record.quorum,
      },
      publicId: record.publicId,
      publisher: { id: record.members[0].publisherId, ...named(record.members[0].publisherId) },
    }
  }

  // Proposing approves the version too, so it takes its spot (SLJ-110): this
  // app then approves nothing else there. A newer proposal of ours for the
  // same spot withdraws the previous one, which is only safe while nobody
  // else has approved it (`withdrawOwn`).
  async function propose(record: SharedCourseRecord, { first }: { first: boolean }) {
    if (!record.courseId) throw new MaintainersError('NOT_HERE', 'This course is not on this device yet')
    const published = await deps.publishedCourse(record.courseId)
    if (!published.versionPath || !published.version) {
      throw new MaintainersError('NOT_PUBLISHED', 'Publish a version first')
    }

    const spec = specOf(record)
    const self = await deps.op('self', { publicId: record.publicId })
    record = await recoverOwnAnswers(record, self)
    const { length, sharedKey } = await deps.op('seedShared', { spec })
    const generation = record.generation ?? 0
    const taken = record.approvedAt[spotKey(generation, length)]
    const previous = record.proposal
    if (previous?.change) {
      throw new MaintainersError('CHANGE_WAITING', 'A change of maintainers is waiting for approval. Publish again once it is decided.')
    }
    if (taken && taken !== previous?.hash) {
      throw new MaintainersError(
        'ALREADY_APPROVED',
        "You approved another version for this point in the course's history. Propose again once it's online or replaced.",
      )
    }
    if (previous) record = await withdrawOwn(record, previous.hash)

    // By time, not a counter kept here: after a restore on a new computer, a
    // counter would start over and reuse a proposal drive the old computer
    // already wrote to.
    const index = Math.max(record.nextProposalIndex, Date.now())
    const { hash, proposalKey, request, sharedLength } = await deps.op('propose', {
      index,
      source: sourceFor(record, sharedKey),
      spec,
      versionPath: published.versionPath,
    })
    // The course moved on meanwhile and that spot is taken: not this one.
    const takenNow = record.approvedAt[spotKey(generation, sharedLength)]
    if (takenNow && takenNow !== hash) {
      await deps.op('dropProposal', { proposalKey }).catch(() => {})
      throw new MaintainersError('ALREADY_APPROVED', "You approved another version for this point in the course's history.")
    }

    const proposal: SharedProposal = {
      first,
      hash,
      proposalKey,
      request,
      title: published.title?.slice(0, 200),
      version: published.version,
    }
    // The proposer approves their own proposal too; the spot goes along, so a
    // new computer knows it (recoverOwnAnswers).
    const { response } = await deps.op('sign', { request, spec })
    await deps.op('writeMailbox', { file: '/proposal.json', publicId: record.publicId, value: proposal })
    await deps.op('writeMailbox', {
      file: `/approvals/${hash}.json`,
      publicId: record.publicId,
      value: { generation, response, spot: sharedLength },
    })
    const proposals = { ...(record.proposals ?? {}) }
    proposals[hash] = {
      approvedBy: [self.publisherId],
      changesRequested: {},
      decidedAt: null,
      from: self.publisherId,
      generation,
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
    save({
      ...record,
      approvedAt: { ...record.approvedAt, [spotKey(generation, sharedLength)]: hash },
      changesRequested: {},
      nextProposalIndex: index + 1,
      proposal,
      proposals: capHistory(proposals),
    })
    return proposal
  }

  // Withdraws our waiting proposal `hash` (SLJ-110), freeing its spot. Only
  // while no other maintainer has approved it: with their approval out
  // there, it could still reach the rule, and approving a rival as well
  // could put two versions online. Checked against every mailbox, read now.
  async function withdrawOwn(record: SharedCourseRecord, hash: string): Promise<SharedCourseRecord> {
    const self = await deps.op('self', { publicId: record.publicId })
    for (const member of involved(record)) {
      if (member.mailboxKey === self.mailboxKey) continue
      const mailbox = await deps.op('readMailbox', { key: member.mailboxKey })
      const approval = mailbox.approvals[hash]
      if (typeof approval?.response === 'string' || typeof approval?.responseNext === 'string') {
        throw new MaintainersError(
          'APPROVED_BY_OTHERS',
          'Others have approved this version already, so it may still go online. It can no longer be withdrawn.',
        )
      }
    }
    await deps.op('writeMailbox', { file: `/withdrawn/${hash}.json`, publicId: record.publicId, value: { at: now() } })
    await deps.op('writeMailbox', { file: '/proposal.json', publicId: record.publicId, value: null })
    const proposalKey = record.proposal?.hash === hash ? record.proposal.proposalKey : record.proposals?.[hash]?.proposalKey
    if (proposalKey) await deps.op('dropProposal', { proposalKey }).catch(() => {})
    const nextKey = (record.proposal?.hash === hash ? record.proposal.change : record.proposals?.[hash]?.change)?.next.proposalKey
    if (nextKey) await deps.op('dropProposal', { proposalKey: nextKey }).catch(() => {})
    const approvedAt = Object.fromEntries(Object.entries(record.approvedAt).filter(([, approved]) => approved !== hash))
    const proposals = { ...(record.proposals ?? {}) }
    const entry = proposals[hash]
    if (entry) proposals[hash] = { ...entry, decidedAt: now(), state: 'withdrawn' }
    const next: SharedCourseRecord = {
      ...record,
      approvedAt,
      changesRequested: record.proposal?.hash === hash ? {} : record.changesRequested,
      proposal: record.proposal?.hash === hash ? null : record.proposal,
      proposals,
    }
    save(next)
    return next
  }

  // Everyone whose mailbox matters for the course: its maintainers, the
  // owner's pending joiners, and the maintainers named by any change still
  // waiting (SLJ-70), once each.
  function involved(record: SharedCourseRecord): Member[] {
    const changes = Object.values(record.proposals ?? {})
      .filter((entry) => entry.state === 'waiting' && entry.change)
      .flatMap((entry) => entry.change!.members)
    const all = [...record.members, ...(record.pending ?? []), ...(record.proposal?.change?.members ?? []), ...changes]
    return all.filter((member, index) => all.findIndex((other) => other.mailboxKey === member.mailboxKey) === index)
  }

  // The course moved to the next generation (SLJ-70): its earlier shared
  // course is kept (students still on it find the notice there).
  function moveTo(
    record: SharedCourseRecord,
    next: { generation: number; members: Member[]; quorum: number },
    selfPublisherId: string,
  ): SharedCourseRecord {
    const wasMember = record.members.some((member) => member.publisherId === selfPublisherId)
    const stillMember = next.members.some((member) => member.publisherId === selfPublisherId)
    return {
      ...record,
      generation: next.generation,
      members: next.members,
      pending: (record.pending ?? []).filter((member) => !next.members.some((other) => other.publisherId === member.publisherId)),
      previous: [
        ...(record.previous ?? []),
        { generation: record.generation ?? 0, members: record.members, quorum: record.quorum },
      ],
      quorum: next.quorum,
      removed: wasMember && !stillMember ? true : record.removed,
      sharedCourseKey: null,
    }
  }

  // Reads every mailbox of the course and acts: new members and rule (from
  // the owner's), proposals to review, approvals of ours (commit once there
  // are enough), and the shared course landing here for a new maintainer.
  async function refresh(publicId: string): Promise<void> {
    let record = records()[publicId]
    if (!record || record.removed) return
    const self = await deps.op('self', { publicId })

    if (record.role === 'maintainer' && record.ownerMailboxKey) {
      const owner = await deps.op('readMailbox', { key: record.ownerMailboxKey })
      const members = parseMembers(owner.members, publicId)
      if (members && members.generation > (record.generation ?? 0) && record.members.length > 0) {
        // A change was approved and committed: the next generation.
        record = moveTo(record, members, self.publisherId)
        save(record)
        if (record.removed) return
      } else if (members && members.generation >= (record.generation ?? 0)) {
        record = { ...record, generation: members.generation, members: members.members, quorum: members.quorum }
        save(record)
      }
    }

    const generation = record.generation ?? 0
    const isMember = (publisherId: string) => record.members.some((member) => member.publisherId === publisherId)
    const responses = new Map<string, string>()
    // A change of ours (SLJ-70): approvals of the moved notice from the
    // current maintainers, of the next first version from the new ones.
    const changeResponses = new Map<string, string>()
    const nextResponses = new Map<string, string>()
    const changesRequested = { ...record.changesRequested }
    const proposals = { ...(record.proposals ?? {}) }
    // Each mailbox's current proposal, by mailbox: an older one of the same
    // proposer still waiting was replaced by it.
    const current = new Map<string, string>()
    let ownMailbox: MailboxContents | null = null
    const ownName = normalizePublisherName(await deps.ownPublisherName?.())
    const names: Record<string, string> = {}
    for (const member of involved(record)) {
      const isSelf = member.mailboxKey === self.mailboxKey
      if (!isSelf) await deps.op('followMailbox', { key: member.mailboxKey })
      const mailbox = await deps.op('readMailbox', { key: member.mailboxKey })
      if (isSelf) ownMailbox = mailbox
      const name = isSelf ? ownName : normalizePublisherName((mailbox.profile as { name?: unknown } | null)?.name)
      if (name) names[member.publisherId] = name
      const proposal = parseProposal(mailbox.proposal)
      // Only maintainers propose versions; a change only comes from the owner.
      const canPropose = proposal && (proposal.change ? member.publisherId === record.members[0]?.publisherId : isMember(member.publisherId))
      if (proposal && canPropose) {
        current.set(member.mailboxKey, proposal.hash)
        proposals[proposal.hash] ??= {
          ...proposal,
          approvedBy: [],
          approvedNextBy: proposal.change ? [] : undefined,
          changesRequested: {},
          decidedAt: null,
          from: member.publisherId,
          generation,
          mailboxKey: member.mailboxKey,
          mine: isSelf,
          proposedAt: now(),
          state: 'waiting',
        }
      }
      // Who approved or asked for changes, for every proposal still waiting;
      // and which of this maintainer's own they withdrew.
      for (const entry of Object.values(proposals)) {
        if (entry.state !== 'waiting') continue
        if (entry.mailboxKey === member.mailboxKey && mailbox.withdrawn?.[entry.hash]) {
          proposals[entry.hash] = { ...entry, decidedAt: now(), state: 'withdrawn' }
          continue
        }
        const approval = mailbox.approvals[entry.hash]
        const approved = typeof approval?.response === 'string' && isMember(member.publisherId)
        const approvedNext =
          typeof approval?.responseNext === 'string' &&
          Boolean(entry.change?.members.some((other) => other.publisherId === member.publisherId))
        const note = mailbox.changesRequested[entry.hash]?.note
        proposals[entry.hash] = {
          ...entry,
          approvedBy: approved && !entry.approvedBy.includes(member.publisherId) ? [...entry.approvedBy, member.publisherId] : entry.approvedBy,
          approvedNextBy:
            approvedNext && !(entry.approvedNextBy ?? []).includes(member.publisherId)
              ? [...(entry.approvedNextBy ?? []), member.publisherId]
              : entry.approvedNextBy,
          changesRequested:
            typeof note === 'string' ? { ...entry.changesRequested, [member.publisherId]: note.slice(0, 2000) } : entry.changesRequested,
        }
      }
      const mine = record.proposal
      if (mine) {
        const approval = mailbox.approvals[mine.hash]
        if (typeof approval?.response === 'string' && isMember(member.publisherId)) {
          if (mine.change) changeResponses.set(member.maintainerKey, approval.response)
          else if (!isSelf) responses.set(member.maintainerKey, approval.response)
        }
        if (mine.change && typeof approval?.responseNext === 'string' && mine.change.members.some((other) => other.mailboxKey === member.mailboxKey)) {
          nextResponses.set(member.maintainerKey, approval.responseNext)
        }
        const note = mailbox.changesRequested[mine.hash]?.note
        if (!isSelf && typeof note === 'string') changesRequested[member.publisherId] = note.slice(0, 2000)
      }
    }
    // Where each waiting proposal stands against its shared course: online
    // once it holds exactly it (whoever committed it), replaced once another
    // version took its spot or its proposer proposed a newer one.
    for (const entry of Object.values(proposals)) {
      if (entry.state !== 'waiting' || record.members.length < 2) continue
      const spec = specAt(record, entry.generation ?? 0)
      const state = spec
        ? await deps
            .op('proposalState', { request: entry.request, spec })
            .then((result) => result.state)
            .catch(() => 'waiting' as const)
        : 'replaced'
      const superseded = current.has(entry.mailboxKey) && current.get(entry.mailboxKey) !== entry.hash
      const next = state === 'waiting' && superseded ? 'replaced' : state
      if (next !== 'waiting') proposals[entry.hash] = { ...entry, decidedAt: now(), state: next }
    }
    record = { ...record, changesRequested, names, proposals: capHistory(proposals) }
    save(record)
    // Our name, for the others' copies of the course's source.json.
    const mailboxName = normalizePublisherName((ownMailbox?.profile as { name?: unknown } | null | undefined)?.name)
    if (ownMailbox && mailboxName !== ownName) {
      await deps.op('writeMailbox', { file: '/profile.json', publicId, value: { name: ownName } }).catch(() => {})
    }
    if (ownMailbox) record = await recoverOwnAnswers(record, self, ownMailbox)

    // Enough approvals of ours (ours included): put it online.
    const mine = record.proposal
    if (mine?.change) {
      if (changeResponses.size >= record.quorum && nextResponses.size >= mine.change.quorum) {
        await commitChange(record, mine, [...changeResponses.values()], [...nextResponses.values()], self.publisherId)
        record = records()[publicId]
      }
    } else if (mine && responses.size + 1 >= record.quorum && record.members.length >= 2) {
      const own = (await deps.op('readMailbox', { key: self.mailboxKey })).approvals[mine.hash]?.response
      if (typeof own === 'string') await commit(record, [own, ...responses.values()])
      record = records()[publicId]
    }

    record = await clearDecided(record)

    if (record.role === 'owner' && record.sharedKey && record.oldCode && record.courseId) {
      await deps.seedOldCode(record.courseId, record.oldCode).catch(() => {})
    }
    // Earlier generations' shared courses stay shared, for their notices.
    for (const earlier of record.previous ?? []) {
      await deps.op('seedShared', { spec: specFor(publicId, earlier.generation, earlier.members, earlier.quorum) }).catch(() => {})
    }

    // The shared course is online: seed it; a new maintainer lands it here,
    // and after a change everyone shares it from its new code.
    if (record.members.length >= 2) {
      const seeded = await deps.op('seedShared', { spec: specOf(record) })
      const movedOnline = Boolean(seeded.version) && record.sharedKey !== seeded.sharedKey
      if (record.sharedCourseKey !== seeded.sharedKey || movedOnline) {
        record = { ...record, sharedCourseKey: seeded.sharedKey, sharedKey: seeded.version ? seeded.sharedKey : record.sharedKey }
        save(record)
        if (movedOnline && record.courseId) deps.onShared(record.courseId)
      }
      if (seeded.courseId && seeded.version && !record.courseId) {
        await land(record, seeded.courseId)
      }
    }
  }

  // Our proposals that are over (committed, withdrawn or replaced, here or
  // before a restart): their drives' copies of the course's history are
  // deleted (SLJ-111), once each. A proposal of ours that someone else's
  // version replaced no longer waits for approval either.
  async function clearDecided(record: SharedCourseRecord): Promise<SharedCourseRecord> {
    const done = Object.values(record.proposals ?? {}).filter((entry) => entry.mine && entry.state !== 'waiting' && !entry.cleared)
    if (done.length === 0) return record
    const proposals = { ...(record.proposals ?? {}) }
    for (const entry of done) {
      try {
        await deps.op('dropProposal', { proposalKey: entry.proposalKey })
        if (entry.change) await deps.op('dropProposal', { proposalKey: entry.change.next.proposalKey })
        proposals[entry.hash] = { ...entry, cleared: true }
      } catch (error) {
        // Tried again at the next refresh.
        console.warn(`[maintainers] couldn't delete proposal ${entry.hash}:`, error)
      }
    }
    const stillWaiting = record.proposal && proposals[record.proposal.hash]?.state !== 'waiting' ? null : record.proposal
    const next: SharedCourseRecord = {
      ...records()[record.publicId],
      changesRequested: stillWaiting ? record.changesRequested : {},
      proposal: stillWaiting,
      proposals,
    }
    save(next)
    return next
  }

  // Our change of maintainers has both rules met (SLJ-70): the new shared
  // course's first version goes online first, then the moved notice on the
  // current one (students follow it only once there's something to follow).
  async function commitChange(
    record: SharedCourseRecord,
    proposal: SharedProposal,
    responses: string[],
    nextResponses: string[],
    selfPublisherId: string,
  ) {
    const change = proposal.change!
    const nextSpec = specFor(record.publicId, change.generation, change.members, change.quorum)
    const { sharedKey } = await deps.op('commit', {
      first: true,
      proposalKey: change.next.proposalKey,
      request: change.next.request,
      responses: nextResponses,
      spec: nextSpec,
    })
    await deps.op('commit', {
      first: false,
      proposalKey: proposal.proposalKey,
      request: proposal.request,
      responses,
      spec: specOf(record),
    })
    await deps.op('dropProposal', { proposalKey: proposal.proposalKey }).catch(() => {})
    await deps.op('dropProposal', { proposalKey: change.next.proposalKey }).catch(() => {})
    const proposals = { ...(record.proposals ?? {}) }
    const entry = proposals[proposal.hash]
    if (entry) proposals[proposal.hash] = { ...entry, decidedAt: now(), state: 'online' }
    const moved: SharedCourseRecord = {
      ...moveTo(record, change, selfPublisherId),
      changesRequested: {},
      proposal: null,
      proposals,
      sharedCourseKey: sharedKey,
      sharedKey,
    }
    save(moved)
    await writeMembers(moved)
    if (moved.courseId) deps.onShared(moved.courseId)
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
  //   anyway. Our own proposals' approvals carry their spot too (SLJ-110),
  //   unless withdrawn; older ones without it are left out.
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
      // A withdrawn proposal of ours freed its spot.
      if (spotted.has(hash) || mailbox.withdrawn?.[hash]) continue
      const generation = Number.isInteger(approval?.generation) ? (approval.generation as number) : 0
      let spot: number | null = Number.isInteger(approval?.spot) ? (approval.spot as number) : null
      const entry = record.proposals?.[hash]
      const spec = entry ? specAt(record, entry.generation ?? 0) : null
      if (spot === null && entry && spec && !entry.mine && entry.state === 'waiting' && typeof approval?.response === 'string') {
        spot = await deps
          .op('review', { proposalKey: entry.proposalKey, request: entry.request, spec })
          .then((review) => review.sharedLength)
          .catch(() => null)
      }
      // A change's next first version (SLJ-70) holds the first spot of the
      // next generation.
      if (typeof approval?.responseNext === 'string') {
        approvedAt[spotKey(generation + 1, 0)] ??= hash
        spotted.add(hash)
      }
      if (spot === null) continue
      approvedAt[spotKey(generation, spot)] ??= hash
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
        // computer, or someone new join as pending, until a change adding
        // them is approved (SLJ-70).
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
        // Shared already: they wait for a change adding them (SLJ-70).
        if (record.sharedKey) {
          const others = (record.pending ?? []).filter((existing) => existing.publisherId !== member.publisherId)
          const next = { ...record, pending: [...others, member] }
          save(next)
          await writeMembers(next)
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
        // A version we withdrew isn't proposed again (Publish runs at every
        // start too); a newer one is.
        const withdrawn = Object.values(current.proposals ?? {}).some(
          (entry) => entry.mine && entry.state === 'withdrawn' && entry.version === published.version,
        )
        // A change of maintainers waiting (SLJ-70) goes first.
        if (canPropose && isNewer && !withdrawn && !current.proposal?.change && current.proposal?.version !== published.version) {
          await propose(current, { first: false })
        }
        return seeded.sharedKey
      })
    },

    // The owner: changes who maintains the course, or the rule (SLJ-70).
    // `publisherIds`: the new maintainers, from the current ones and those
    // who joined since (pending); the owner stays. The course moves to a new
    // shared course (a new code; students follow on their own), once the
    // current maintainers approve under the current rule and the new ones
    // under the new rule. The course's content stays as it is online.
    async proposeChange(courseId: string, input: { publisherIds: string[]; quorum: number }): Promise<SharedProposal> {
      const found = recordFor(courseId)
      if (!found || found.role !== 'owner' || found.removed) {
        throw new MaintainersError('NOT_OWNER', 'Only the course owner changes its maintainers')
      }
      if (!found.sharedKey) throw new MaintainersError('NOT_SHARED', 'This course is not shared yet')
      return serial(found.publicId, async () => {
        let record = records()[found.publicId]
        if (record.proposal) {
          throw new MaintainersError(
            'PROPOSAL_WAITING',
            'Something you proposed is waiting for approval. Change the maintainers once it is decided, or withdraw it.',
          )
        }
        const owner = record.members[0]
        const candidates = [...record.members, ...(record.pending ?? [])]
        const wanted = new Set([owner.publisherId, ...input.publisherIds])
        const members = candidates.filter(
          (member, index) =>
            wanted.has(member.publisherId) && candidates.findIndex((other) => other.publisherId === member.publisherId) === index,
        )
        if (members.length !== wanted.size) {
          throw new MaintainersError('UNKNOWN_MAINTAINER', 'Only maintainers and people who joined with an invite can be chosen')
        }
        if (members.length < 2) {
          throw new MaintainersError('NO_MAINTAINERS', 'A course maintained together needs at least two maintainers')
        }
        assertRule(input.quorum, members.length)
        const same =
          input.quorum === record.quorum &&
          members.length === record.members.length &&
          members.every((member) => record.members.some((other) => other.publisherId === member.publisherId))
        if (same) throw new MaintainersError('NO_CHANGE', 'Nothing changes')

        const self = await deps.op('self', { publicId: record.publicId })
        record = await recoverOwnAnswers(record, self)
        const spec = specOf(record)
        const generation = record.generation ?? 0
        const seeded = await deps.op('seedShared', { spec })
        const published = await deps.publishedCourse(courseId)
        if (!published.versionPath || !seeded.version || published.version !== seeded.version) {
          throw new MaintainersError('NOT_LATEST', "The version online isn't the one published here yet. Change the maintainers once it is.")
        }
        if (record.approvedAt[spotKey(generation, seeded.length)]) {
          throw new MaintainersError('ALREADY_APPROVED', "You approved another version for this point in the course's history.")
        }

        const nextGeneration = generation + 1
        const nextSpec = specFor(record.publicId, nextGeneration, members, input.quorum)
        // Seeding the new shared course announces it already.
        const { sharedKey: nextKey } = await deps.op('seedShared', { spec: nextSpec })
        // By time, like any proposal (see `propose`).
        const index = Math.max(record.nextProposalIndex, Date.now())
        const next = await deps.op('propose', {
          index,
          source: sourceFor({ generation: nextGeneration, members, names: record.names, publicId: record.publicId, quorum: input.quorum }, nextKey),
          spec: nextSpec,
          versionPath: published.versionPath,
        })
        const notice = await deps.op('propose', {
          index: index + 1,
          source: { ...sourceFor(record, seeded.sharedKey), movedTo: { driveKey: nextKey } },
          spec,
          versionPath: published.versionPath,
        })
        const change: MaintainersChange = {
          generation: nextGeneration,
          members,
          next: { hash: next.hash, proposalKey: next.proposalKey, request: next.request },
          quorum: input.quorum,
        }
        const proposal: SharedProposal = {
          change,
          first: false,
          hash: notice.hash,
          proposalKey: notice.proposalKey,
          request: notice.request,
          title: published.title?.slice(0, 200),
          version: seeded.version,
        }
        // The owner approves both parts.
        const response = (await deps.op('sign', { request: notice.request, spec })).response
        const responseNext = (await deps.op('sign', { request: next.request, spec: nextSpec })).response
        await deps.op('writeMailbox', { file: '/proposal.json', publicId: record.publicId, value: proposal })
        await deps.op('writeMailbox', {
          file: `/approvals/${notice.hash}.json`,
          publicId: record.publicId,
          value: { generation, response, responseNext, spot: notice.sharedLength },
        })
        const proposals = { ...(record.proposals ?? {}) }
        proposals[notice.hash] = {
          approvedBy: [self.publisherId],
          approvedNextBy: [self.publisherId],
          change,
          changesRequested: {},
          decidedAt: null,
          from: self.publisherId,
          generation,
          hash: notice.hash,
          mailboxKey: self.mailboxKey,
          mine: true,
          proposalKey: notice.proposalKey,
          proposedAt: now(),
          request: notice.request,
          state: 'waiting',
          title: proposal.title,
          version: proposal.version,
        }
        save({
          ...record,
          approvedAt: {
            ...record.approvedAt,
            [spotKey(generation, notice.sharedLength)]: notice.hash,
            [spotKey(nextGeneration, 0)]: notice.hash,
          },
          changesRequested: {},
          nextProposalIndex: index + 2,
          proposal,
          proposals: capHistory(proposals),
        })
        return proposal
      })
    },

    // Restoring the identity on a new computer (SLJ-54): the owner's course
    // moved to a shared one. Takes up maintaining it again from what the
    // shared course says (its maintainers, with their mailboxes, and the
    // rule), and lands its latest version here.
    async restoreSharedCourse(input: { oldCode: string; publicId: string; sharedKey: string }): Promise<{
      courseId: string
      // The latest shared course's key: the course's code now.
      sharedKey: string
      title: string
    }> {
      return serial(input.publicId, async () => {
        // Its maintainers may have changed since (SLJ-70): each change moved
        // it on to the next generation's shared course, named in the
        // previous one's notice. The latest is the one taken up.
        let sharedKey = input.sharedKey
        let shared = await deps.op('readSharedSource', { sharedKey })
        const previous: NonNullable<SharedCourseRecord['previous']> = []
        for (let hops = 0; shared.movedTo && hops < MAX_GENERATIONS; hops++) {
          const earlier = parseSharedSource(shared.source)
          if (earlier) previous.push({ generation: earlier.generation, members: earlier.members, quorum: earlier.quorum })
          sharedKey = shared.movedTo
          shared = await deps.op('readSharedSource', { sharedKey })
        }
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
          generation: parsed.generation,
          members: parsed.members,
          nextProposalIndex: 0,
          oldCode: role === 'owner' ? input.oldCode : null,
          ownerMailboxKey: role === 'owner' ? null : parsed.members[0].mailboxKey,
          previous,
          proposal: null,
          publicId: input.publicId,
          quorum: parsed.quorum,
          role,
          sharedCourseKey: sharedKey,
          sharedKey,
        }
        save(record)
        // The owner says again who maintains it and the rule, in her mailbox
        // (continued from its history, never forked: maintainers.cjs), for
        // maintainers who join again from a new computer.
        if (role === 'owner') await writeMembers(record)
        await land(record, shared.courseId)
        return { courseId: shared.courseId, sharedKey, title: shared.title ?? '' }
      })
    },

    // Removed from its maintainers (SLJ-70), the course is this device's
    // own again.
    isShared(courseId: string): boolean {
      const record = recordFor(courseId)
      return Boolean(record?.sharedKey) && !record?.removed
    },

    // A mailbox or shared course changed: refresh the courses it belongs to.
    onDriveChanged(driveKey: string): void {
      for (const record of Object.values(records())) {
        const concerned =
          record.ownerMailboxKey === driveKey ||
          record.sharedKey === driveKey ||
          record.sharedCourseKey === driveKey ||
          involved(record).some((member) => member.mailboxKey === driveKey)
        if (concerned) void serial(record.publicId, () => refresh(record.publicId)).catch(logFailure(record.publicId))
      }
    },

    async start(): Promise<void> {
      startPeriodicRefresh()
      for (const publicId of Object.keys(records())) {
        // Our proposal still waiting: its drive is opened again, so it can be
        // committed here and reviewers can fetch it (SLJ-111).
        const proposal = records()[publicId].proposal
        for (const proposalKey of [proposal?.proposalKey, proposal?.change?.next.proposalKey]) {
          if (proposalKey) await deps.op('openProposal', { proposalKey }).catch(logFailure(publicId))
        }
        await serial(publicId, () => refresh(publicId)).catch(logFailure(publicId))
      }
    },

    // The profile is closing.
    stop(): void {
      periodic?.cancel()
      periodic = null
    },

    refresh: (publicId: string) => serial(publicId, () => refresh(publicId)),

    // Who this profile maintains courses with (Publishers, SLJ-108): every
    // other maintainer and joined person of each course it still maintains,
    // with the course's id on this device (when it's here) and title.
    knownPublishers(): { courseId: string | null; publicId: string; publisherId: string; title: string | null }[] {
      return Object.values(records())
        .filter((record) => !record.removed)
        .flatMap((record) => {
          const title = record.proposal?.title ?? Object.values(record.proposals ?? {}).find((entry) => entry.title)?.title ?? null
          return [...record.members, ...(record.pending ?? [])].map((member) => ({
            courseId: record.courseId,
            publicId: record.publicId,
            publisherId: member.publisherId,
            title,
          }))
        })
    },

    // What the course's maintainer panel shows.
    getInfo(courseId: string) {
      const record = recordFor(courseId)
      if (!record) return null
      const change = record.proposal?.change
      return {
        changesRequested: record.changesRequested,
        members: record.members.map((member) => ({ publisherId: member.publisherId })),
        // Who joined since the course is shared (SLJ-70), the owner's.
        pending: (record.pending ?? []).map((member) => ({ publisherId: member.publisherId })),
        // Our version waiting for approval, or our change of maintainers.
        proposal: record.proposal
          ? {
              change: change
                ? { members: change.members.map((member) => ({ publisherId: member.publisherId })), quorum: change.quorum }
                : null,
              hash: record.proposal.hash,
              version: record.proposal.version,
            }
          : null,
        quorum: record.quorum,
        removed: Boolean(record.removed),
        role: record.role,
        sharedKey: record.sharedKey,
      }
    },

    // Every course's proposals, waiting and decided, in the Approvals page's
    // groups (SLJ-109); `maintained`: how many shared courses this profile
    // maintains (the sidebar shows Approvals once there is one).
    listApprovals(): { items: ApprovalItem[]; maintained: number } {
      const courses = Object.values(records()).filter((record) => record.members.length >= 2 || (record.proposals && Object.keys(record.proposals).length > 0))
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
          withdrawn: entry.state === 'withdrawn',
          change: entry.change ? changeSummary(record, entry) : null,
        })),
      )
      return { items, maintained: courses.filter((record) => record.members.length >= 2 && !record.removed).length }
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
        // Withdrawn or replaced by its proposer meanwhile: nothing to approve.
        const proposer = await deps.op('readMailbox', { key: item.mailboxKey })
        const stillProposed = parseProposal(proposer.proposal)?.hash
        // (A read that timed out comes back empty: that alone proves nothing.)
        if (proposer.withdrawn?.[hash] || (stillProposed !== undefined && stillProposed !== hash)) {
          const latest = records()[publicId]
          save({
            ...latest,
            proposals: {
              ...latest.proposals,
              [hash]: { ...item, decidedAt: now(), state: proposer.withdrawn?.[hash] ? 'withdrawn' : 'replaced' },
            },
          })
          throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
        }
        const generation = item.generation ?? 0
        const spec = specAt(record, generation)
        if (!spec) throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
        // A change of maintainers (SLJ-70): the current maintainers approve
        // the moved notice, the new ones the next shared course's first
        // version; someone in both, both.
        const inCurrent = record.members.some((member) => member.publisherId === self.publisherId)
        const change = item.change
        const inNext = Boolean(change?.members.some((member) => member.publisherId === self.publisherId))
        if (change && !inCurrent && !inNext) throw new MaintainersError('NOT_INVOLVED', "This change doesn't involve you")

        const value: { generation: number; response?: string; responseNext?: string; spot?: number } = { generation }
        const approvedAt = { ...record.approvedAt }
        if (!change || inCurrent) {
          const { changes, sharedLength } = await deps
            .op('review', { proposalKey: item.proposalKey, request: item.request, spec })
            .catch((error) => {
              // Another version took its spot meanwhile.
              if ((error as { code?: unknown })?.code === 'NOT_LATEST' || /latest version/.test(String(error))) markReplaced(record, hash)
              throw error
            })
          // The moved notice changes nothing else in the course.
          if (change && changes.some((entry) => !BOOKKEEPING_FILES.has(entry.path))) {
            throw new MaintainersError('CHANGE_MISMATCH', 'This change of maintainers also changes the course')
          }
          const spot = spotKey(generation, sharedLength)
          const earlier = approvedAt[spot]
          if (earlier && earlier !== hash) {
            throw new MaintainersError('ALREADY_APPROVED', 'You already approved another version for this spot')
          }
          value.response = (await deps.op('sign', { request: item.request, spec })).response
          // The spot goes along, so a new computer knows it too (recoverOwnAnswers).
          value.spot = sharedLength
          approvedAt[spot] = hash
        }
        if (change && inNext) {
          // The request must be for the shared course of the maintainers and
          // rule the change names (its key comes from them).
          const nextSpec = specFor(publicId, change.generation, change.members, change.quorum)
          await deps.op('review', { proposalKey: change.next.proposalKey, request: change.next.request, spec: nextSpec })
          const spot = spotKey(change.generation, 0)
          const earlier = approvedAt[spot]
          if (earlier && earlier !== hash) {
            throw new MaintainersError('ALREADY_APPROVED', 'You already approved another change for these maintainers')
          }
          value.responseNext = (await deps.op('sign', { request: change.next.request, spec: nextSpec })).response
          approvedAt[spot] = hash
        }
        await deps.op('writeMailbox', { file: `/approvals/${hash}.json`, publicId, value })
        const proposals = { ...(record.proposals ?? {}) }
        proposals[hash] = {
          ...item,
          approvedBy: value.response ? [...new Set([...item.approvedBy, self.publisherId])] : item.approvedBy,
          approvedNextBy: value.responseNext ? [...new Set([...(item.approvedNextBy ?? []), self.publisherId])] : item.approvedNextBy,
        }
        save({ ...record, answered: [...record.answered, hash], approvedAt, proposals })
      })
    },

    // Withdraws our own waiting proposal (SLJ-110): only while no other
    // maintainer has approved it.
    withdraw(publicId: string, hash: string): Promise<void> {
      return serial(publicId, async () => {
        const record = records()[publicId]
        const entry = record?.proposals?.[hash]
        if (!record || !entry?.mine || entry.state !== 'waiting') {
          throw new MaintainersError('NO_PROPOSAL', 'This proposal is no longer waiting')
        }
        await withdrawOwn(record, hash)
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

function specFor(publicId: string, generation: number, members: Member[], quorum: number): SharedCourseSpecInput {
  return { generation, publicId, quorum, signers: members.map((member) => member.maintainerKey) }
}

// A spot in the course's history: the shared course's length a version
// builds on, in its generation (SLJ-70; generation 0 keeps the plain length
// it was stored under before).
function spotKey(generation: number, length: number): string {
  return generation > 0 ? `${generation}:${length}` : String(length)
}

// A change of maintainers as Approvals shows it (SLJ-70): who it adds and
// removes against the maintainers it was proposed under, the new rule, and
// who of the new maintainers approved the new shared course.
function changeSummary(record: SharedCourseRecord, entry: ProposalRecord): ApprovalItem['change'] {
  const change = entry.change!
  const generation = entry.generation ?? 0
  const before =
    generation === (record.generation ?? 0) ? record : record.previous?.find((earlier) => earlier.generation === generation)
  const beforeIds = (before?.members ?? record.members).map((member) => member.publisherId)
  const afterIds = change.members.map((member) => member.publisherId)
  const approvedBy = entry.approvedNextBy ?? []
  return {
    added: afterIds.filter((id) => !beforeIds.includes(id)),
    approvedBy,
    count: afterIds.length,
    previousCount: beforeIds.length,
    missing: entry.state === 'waiting' ? afterIds.filter((id) => !approvedBy.includes(id)) : [],
    previousQuorum: before?.quorum ?? record.quorum,
    quorum: change.quorum,
    removed: beforeIds.filter((id) => !afterIds.includes(id)),
  }
}

// Which group of the Approvals page a proposal is in.
function groupOf(record: SharedCourseRecord, entry: ProposalRecord): ApprovalGroup {
  if (entry.state === 'online') return 'approved'
  if (entry.state === 'replaced' || entry.state === 'withdrawn') return 'replaced'
  if (!entry.mine && !record.answered.includes(entry.hash)) return 'waiting-for-you'
  return Object.keys(entry.changesRequested).length > 0 ? 'changes-requested' : 'waiting-for-others'
}

// How many changes of maintainers restoring follows (SLJ-70): a bound on a
// chain of notices read from the network.
const MAX_GENERATIONS = 50

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

// A locked publishing identity (before the password is given) isn't a
// failure: every course is refreshed again every REFRESH_INTERVAL_MS, and that
// works once it's unlocked.
function logFailure(publicId: string) {
  return (error: unknown) => {
    if ((error as { code?: string } | null)?.code === 'LOCKED') return
    console.error(`[maintainers] ${publicId} failed:`, error)
  }
}

function parseMemberList(value: unknown): Member[] | null {
  if (!Array.isArray(value)) return null
  const members = value.filter(
    (member): member is Member =>
      Boolean(member) &&
      typeof member.mailboxKey === 'string' &&
      typeof member.maintainerKey === 'string' &&
      typeof member.publisherId === 'string',
  )
  return members.length === value.length ? members.map(({ mailboxKey, maintainerKey, publisherId }) => ({ mailboxKey, maintainerKey, publisherId })) : null
}

function parseGeneration(value: unknown): number | null {
  if (value === undefined) return 0
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null
}

function parseMembers(value: unknown, publicId: string): { generation: number; members: Member[]; quorum: number } | null {
  const data = value as { generation?: unknown; members?: unknown; publicId?: unknown; quorum?: unknown } | null
  if (!data || data.publicId !== publicId || typeof data.quorum !== 'number') return null
  const members = parseMemberList(data.members)
  const generation = parseGeneration(data.generation)
  if (!members || members.length === 0 || generation === null) return null
  return { generation, members, quorum: data.quorum }
}

// A change's description in a proposal (SLJ-70), checked: remote data.
function parseChange(value: unknown): MaintainersChange | null {
  const data = value as Partial<MaintainersChange> | null
  const members = parseMemberList(data?.members)
  const next = data?.next as Partial<MaintainersChange['next']> | undefined
  if (
    !data ||
    !members ||
    members.length < 2 ||
    !Number.isInteger(data.generation) ||
    (data.generation as number) < 1 ||
    !Number.isInteger(data.quorum) ||
    (data.quorum as number) <= members.length / 2 ||
    (data.quorum as number) > members.length ||
    typeof next?.hash !== 'string' ||
    typeof next.proposalKey !== 'string' ||
    typeof next.request !== 'string'
  ) {
    return null
  }
  return {
    generation: data.generation as number,
    members,
    next: { hash: next.hash, proposalKey: next.proposalKey, request: next.request },
    quorum: data.quorum as number,
  }
}

// The shared course's source.json: its owner, maintainers (with mailboxes)
// and rule.
function parseSharedSource(
  value: unknown,
): { generation: number; members: Member[]; ownerPublisherId: string; quorum: number } | null {
  const data = value as {
    maintainers?: { generation?: unknown; members?: unknown; quorum?: unknown }
    publisher?: { id?: unknown }
  } | null
  const members = parseMemberList(data?.maintainers?.members)
  const quorum = data?.maintainers?.quorum
  const owner = data?.publisher?.id
  const generation = parseGeneration(data?.maintainers?.generation)
  if (!members || members.length === 0 || typeof quorum !== 'number' || typeof owner !== 'string' || generation === null) return null
  return { generation, members, ownerPublisherId: owner, quorum }
}

function parseProposal(
  value: unknown,
): Pick<ProposalRecord, 'change' | 'hash' | 'proposalKey' | 'request' | 'title' | 'version'> | null {
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
  // A proposal naming a change it doesn't describe properly isn't one.
  const change = data.change === undefined ? undefined : parseChange(data.change)
  if (change === null) return null
  return {
    change,
    hash: data.hash,
    proposalKey: data.proposalKey,
    request: data.request,
    title: typeof data.title === 'string' ? data.title.slice(0, 200) : undefined,
    version: data.version,
  }
}

export type MaintainersService = ReturnType<typeof createMaintainers>
