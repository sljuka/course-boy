// Peer-to-peer work (see docs/pear-integration-notes.md), phases 1–4:
// Phase 1 generates and persists a Corestore-backed identity keypair inside the Bare
// worker — the user's "creator key." Phase 2 adds mirroring a course's package
// directory into a Hyperdrive under that same Corestore (namespaced per course, so
// each course gets its own key derived from the same root seed rather than reusing the
// identity key as a Hypercore signing key). Phase 3 adds real Hyperswarm discovery, so
// an import can finally find a peer to replicate from — the thing Phase 2 built and
// proved correct but left unwired, since there was nothing to connect it to yet.
// Phase 4 adds gated sharing: a course can be published so it's only reachable by
// peers who redeem a `blind-pairing` invite (optionally time/use-limited) rather than
// anyone who finds the discovery key. Identity/publish/import/gating are all real
// capabilities with no UI in front of them yet (that's Phase 6's "Share"/"Import"
// triggers), so these phases only build and verify the mechanism, the same low-level
// way Phase 0 did.
//
// Phase 0's raw ping/pong was superseded in Phase 1: a real request needs a real
// request/response protocol, so the pipe carries `bare-rpc` — bare-rpc does its own
// framing and must sit directly on the raw duplex, not stacked under another framing
// layer.
import path from 'node:path'
import protocol from '../workers/protocol.json'
import { startWorker, type WorkerClient } from '../workers/worker-client.mjs'
import { app } from 'electron'
import { getProfileDataDir } from './profile-context'
import { getPublishedCoursePackagePath } from './course-paths'
import { isValidCourseId } from '../src/lib/course-id'
import type { RemoteCourseVersion } from './course-sharing'
import type { TransferInfo } from '../src/lib/sharing'
import type { ActivityPayload, ActivityWorkerTotals } from '../src/lib/course-activity'
import type { BoardCursor, BoardModeration, BoardModerationChanges, BoardWorkerMessage, BoardWorkerPage } from '../src/lib/course-board'

// The worker's RPC numbers, shared with it and with the headless seeder.
const CMD = protocol.commands
const EVENT = protocol.events

declare global {
  // 'spawning' until the worker answers, then 'ready', or 'error: …'
  // (scripts/check-packaged.mjs reads it).
  var __matkoWorkerStatus: string
  var __matkoBareWorker: {
    createInvite: typeof createInvite
    cancelTransfer: typeof cancelTransfer
    checkUpdate: typeof checkUpdate
    downloadUpdate: typeof downloadUpdate
    getTransfer: typeof getTransfer
    getPeers: typeof getPeers
    openIdentity: typeof openIdentity
    readIdentityBackup: typeof readIdentityBackup
    findCourse: typeof findCourse
    seedCourse: typeof seedCourse
    followCourse: typeof followCourse
    getCreatorKey: typeof getCreatorKey
    importCourse: typeof importCourse
    publishCourse: typeof publishCourse
    publishGatedCourse: typeof publishGatedCourse
    redeemInvite: typeof redeemInvite
    stopSharing: typeof stopSharing
  }
}

// The running worker (workers/worker-client.mjs), so a profile switch can stop
// it (stopBareWorker).
let worker: WorkerClient | null = null

function requireWorker(): WorkerClient {
  if (!worker) {
    throw new Error('Bare worker is not running')
  }

  return worker
}

// The publisher id while the identity is unlocked in the worker, else ''.
// The app's own publisher id comes from main (publisher-identity.ts), which
// knows it while locked too; this is the worker's answer, used at start to
// know it runs.
export async function getCreatorKey(): Promise<string> {
  return requireWorker().requestRaw(CMD.GET_CREATOR_KEY)
}

async function resolveSharedCoursePackagePath(
  courseId: string,
  version?: string,
): Promise<string> {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  const coursePath = version
    ? path.join(getProfileDataDir(), 'courses', courseId, 'versions', version)
    : await getPublishedCoursePackagePath(courseId)

  if (!coursePath) {
    throw new Error(`Course "${courseId}" has no published version to share`)
  }

  return coursePath
}

// Every reply is JSON with an optional `error`; turn that into a thrown Error.
// `code` (e.g. LOCKED, WRONG_PASSWORD, CANCELLED) is kept on it.
// `code` carries e.g. CANCELLED (a transfer the user stopped) to the caller;
// `fromWorker`: the worker answered with it, unlike a worker that stopped (the
// app quitting) and never answered (see workers/worker-client.mjs).
async function sendCommand<T>(command: number, payload: unknown): Promise<T> {
  return requireWorker().request<T>(command, payload)
}

export function isCancelledError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'CANCELLED'
}

// Mirrors the course's *current published version* into its drive (plus
// source.json) and announces it. `publicIndex` is the course's number among
// the publisher's courses (given at its first Publish, the same ever after);
// its public id and the drive key (the course's code) follow from it and the
// identity. Needs the identity: fails with `code` LOCKED without it.
// `publisherName`: the name the teacher's courses carry (their channel's),
// written into the course's source.json next to their Publisher ID;
// `channelCode`: the channel the course is shown on (SLJ-31). Empty to leave
// either out.
export async function publishCourse(
  courseId: string,
  publicIndex: number,
  publisherName: string,
  channelCode: string,
): Promise<{ driveKey: string; publicId: string }> {
  const coursePath = await resolveSharedCoursePackagePath(courseId)
  return sendCommand<{ driveKey: string; publicId: string }>(CMD.PUBLISH_COURSE, {
    channelCode,
    courseId,
    coursePath,
    publicIndex,
    publisherName,
  })
}

export type ImportedCourseSource = {
  // The course was here already (imported before, and followed): nothing was
  // downloaded, and `publisherId` is empty.
  alreadyImported: boolean
  courseId: string
  // A code can be a program's (SLJ-32): it then landed under programs/.
  kind: 'course' | 'program'
  programId: string
  driveKey: string
  // Claimed by the course's source.json; unverified until SLJ-18.
  publisherId: string
}

// `transferId`: to poll progress (getTransfer) and cancel (cancelTransfer).
export async function importCourse(driveKey: string, transferId?: string): Promise<ImportedCourseSource> {
  const coursesRoot = path.join(getProfileDataDir(), 'courses')
  const programsRoot = path.join(getProfileDataDir(), 'programs')
  const result = await sendCommand<Partial<ImportedCourseSource>>(CMD.IMPORT_COURSE, {
    coursesRoot,
    driveKey,
    programsRoot,
    transferId,
  })

  return {
    alreadyImported: result.alreadyImported === true,
    courseId: result.courseId ?? '',
    driveKey: result.driveKey ?? '',
    kind: result.kind === 'program' ? 'program' : 'course',
    programId: result.programId ?? '',
    publisherId: result.publisherId ?? '',
  }
}

// ─── Programs (SLJ-32) ──────────────────────────────────────────────────────

// Mirrors a program's folder (program.json and its images) into its drive and
// announces it. `publicIndex`: the program's number among the publisher's
// programs (its own counter); its code follows from it and the identity.
// Fails with `code` LOCKED without the identity.
export async function publishProgram(
  programId: string,
  programPath: string,
  publicIndex: number,
  publisherName: string,
): Promise<{ driveKey: string; publicId: string }> {
  return sendCommand(CMD.PUBLISH_PROGRAM, { programId, programPath, publicIndex, publisherName })
}

// Shares a published program by its code while the identity is locked.
export async function seedProgram(programId: string, driveKey: string): Promise<void> {
  await sendCommand(CMD.SEED_PROGRAM, { driveKey, programId })
}

// A course's course.json and claimed publisher by its code, without importing
// it. Fails with `code` NOT_FOUND when nobody sharing it is online.
// What a drive has in it, read from peers without importing it: a course's
// or a program's (channel's) manifest and who published it. `withContents`:
// also what importing it would bring (size, files, a course's sections,
// lessons and tests, or the download limit it crosses; SLJ-153), from its
// listing. Throws code NOT_FOUND (nobody sharing it is online) or NOT_MATKO.
export type PeekedDriveContents = {
  bytes: number | null
  files: number | null
  lessons: number
  limit: 'COURSE_TOO_BIG' | 'TOO_MANY_FILES' | null
  sections: number
  tests: number
}

export async function peekCourse(
  driveKey: string,
  { withContents = false }: { withContents?: boolean } = {},
): Promise<{
  contents: PeekedDriveContents | null
  kind?: 'course' | 'program'
  manifest: unknown
  peers?: number
  publisherId: string | null
  publisherName?: string | null
}> {
  return sendCommand(CMD.PEEK_COURSE, { driveKey, withContents })
}

// Reopens an imported course's drive and announces it again (after a restart).
export async function followCourse(driveKey: string): Promise<void> {
  await sendCommand(CMD.FOLLOW_COURSE, { driveKey })
}

// Which version an imported course's drive holds now, from its small files
// (course.json, changelog.json, source.json); nothing else is downloaded.
// `waitForPeers`: asked by the student (SLJ-184), so wait for someone sharing
// it; with nobody online the answer says so (`nobodyOnline`).
export async function checkUpdate(
  driveKey: string,
  { waitForPeers = false }: { waitForPeers?: boolean } = {},
): Promise<RemoteCourseVersion> {
  return sendCommand<RemoteCourseVersion>(CMD.CHECK_UPDATE, { driveKey, waitForPeers })
}

export type DownloadedUpdate = {
  changedFiles: { key: string; op: string }[]
}

// Mirrors the drive onto `targetPath` (a hardlinked copy of the current course;
// see `downloadUpdate` in workers/main.cjs for why that's safe).
export async function downloadUpdate(
  driveKey: string,
  targetPath: string,
  transferId?: string,
): Promise<DownloadedUpdate> {
  return sendCommand<DownloadedUpdate>(CMD.DOWNLOAD_UPDATE, { driveKey, targetPath, transferId })
}

export async function getTransfer(transferId: string): Promise<TransferInfo | null> {
  return (await sendCommand<{ transfer: TransferInfo | null }>(CMD.GET_TRANSFER, { transferId })).transfer
}

export async function cancelTransfer(transferId: string): Promise<void> {
  await sendCommand(CMD.CANCEL_TRANSFER, { transferId })
}

// Peers connected for a course shared from this device (your own by course id,
// an imported one by drive key); null when it isn't shared here right now.
export async function getPeers(target: { courseId: string; driveKey?: string } | { driveKey: string }): Promise<number | null> {
  return (await sendCommand<{ peers: number | null }>(CMD.GET_PEERS, target)).peers
}

export type IdentityBackupInfo = { createdAt: string; publisherId: string }

// The backup file's public part, checked by the worker (it owns the format):
// who it belongs to and when it was saved. Fails with `code` INVALID_FILE or
// UNSUPPORTED_VERSION.
export async function readIdentityBackup(text: string): Promise<IdentityBackupInfo> {
  return sendCommand<IdentityBackupInfo>(CMD.READ_IDENTITY_BACKUP, { text })
}

// The publisher identity (SLJ-55) is kept by main (electron/publisher-identity.ts)
// and handed to the worker in memory; null takes it back (locked). Returns the
// publisher id it signs as.
export async function setIdentity(key: Buffer | null): Promise<string | null> {
  return (await sendCommand<{ publisherId: string | null }>(CMD.SET_IDENTITY, { key: key?.toString('base64') ?? null }))
    .publisherId
}

// The identity locked with `password`, in the backup file's format (no courses).
export async function sealIdentity(key: Buffer, password: string): Promise<string> {
  return (await sendCommand<{ sealed: string }>(CMD.SEAL_IDENTITY, { key: key.toString('base64'), password })).sealed
}

export type OpenedIdentity = { courses: { id: string; title: string }[]; key: Buffer; publisherId: string }

// Opens a backup file, or main's password-locked copy, with `password`. Fails
// with `code` WRONG_PASSWORD on a wrong password, INVALID_FILE on a damaged file.
export async function openIdentity(text: string, password: string): Promise<OpenedIdentity> {
  const result = await sendCommand<{ courses: OpenedIdentity['courses']; key: string; publisherId: string }>(
    CMD.OPEN_IDENTITY,
    { password, text },
  )
  return { courses: result.courses, key: Buffer.from(result.key, 'base64'), publisherId: result.publisherId }
}

// Shares a published course by its code without the identity (locked):
// students can still download it; a new version needs the identity.
export async function seedCourse(courseId: string, driveKey: string): Promise<void> {
  await sendCommand(CMD.SEED_COURSE, { courseId, driveKey })
}

export type FoundCourse = {
  // The course's own (local) id, from its course.json.
  courseId: string
  // It moved to a course shared by several maintainers (SLJ-11): its key.
  movedTo?: string | null
  driveKey: string
  publicId: string
  publisherId: string
  version: string
}

// Restoring: looks for this publisher's course number `index` among students
// for at most `timeoutMs` and downloads its published version into
// `stagingPath`. Fails with `code` NOT_FOUND when nobody who has it answered.
export async function findCourse(input: {
  index: number
  stagingPath: string
  timeoutMs: number
  transferId?: string
}): Promise<FoundCourse> {
  return sendCommand<FoundCourse>(CMD.FIND_COURSE, input)
}

export type FoundProgram = {
  driveKey: string
  programId: string
  publicId: string
  publisherId: string
}

// Restoring (SLJ-32): this publisher's program number `index`, like
// findCourse: downloads it into `stagingPath`, or fails with NOT_FOUND.
export async function findProgram(input: {
  index: number
  stagingPath: string
  timeoutMs: number
  transferId?: string
}): Promise<FoundProgram> {
  return sendCommand<FoundProgram>(CMD.FIND_PROGRAM, input)
}

// ─── Courses shared by several maintainers (SLJ-11) ────────────────────────
// The worker carries the operations out (workers/shared-course.cjs and
// workers/maintainers.cjs); electron/maintainers.ts decides when.

// A shared course: its original public id, its maintainers' keys and how many
// must approve a version, and its generation (SLJ-70: one more each time the
// maintainers or the rule change; 0 when unset).
export type SharedCourseSpecInput = { generation?: number; publicId: string; quorum: number; signers: string[] }

// What a maintainer tells the others about themselves for one course.
export type MaintainerSelf = { mailboxKey: string; maintainerKey: string; publisherId: string }

export type MaintainerJoined = { member: MaintainerSelf; publicId: string }

export type MailboxContents = {
  // An approval: `response` for the proposal's request, its spot and
  // generation; for a change of maintainers (SLJ-70) `responseNext` too.
  approvals: Record<string, { generation?: unknown; response?: unknown; responseNext?: unknown; spot?: unknown }>
  changesRequested: Record<string, { note?: unknown }>
  members: unknown
  // `{ name }`: its maintainer's Publisher name. Missing in older readers.
  profile?: unknown
  proposal: unknown
  // Proposals their author withdrew (SLJ-110), by request hash. Missing in
  // readers older than that.
  withdrawn?: Record<string, unknown>
}

export type ProposalChange = { kind: 'added' | 'changed' | 'removed'; path: string }

type SharedCourseOps = {
  acceptInvite: [{ code: string }, { ownerMailboxKey: string; publicId: string }]
  commit: [
    { first: boolean; proposalKey: string; request: string; responses: string[]; spec: SharedCourseSpecInput },
    { sharedKey: string },
  ]
  createInvite: [{ invitee: string; publicId: string }, { code: string }]
  downloadShared: [{ spec: SharedCourseSpecInput; stagingPath: string }, { courseId: string; version: string }]
  downloadProposal: [{ length: number; proposalKey: string; stagingPath: string }, { courseId: string; version: string }]
  dropProposal: [{ proposalKey: string }, { cleared: boolean }]
  openProposal: [{ proposalKey: string }, { opened: boolean }]
  followMailbox: [{ key: string }, Record<string, never>]
  moveNotice: [{ courseId: string; publicId: string; sharedKey: string }, Record<string, never>]
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
  writeMailbox: [{ file: string; publicId: string; value: unknown }, Record<string, never>]
}

export async function sharedCourseOp<K extends keyof SharedCourseOps>(
  op: K,
  args: SharedCourseOps[K][0],
): Promise<SharedCourseOps[K][1]> {
  return sendCommand<SharedCourseOps[K][1]>(CMD.SHARED_COURSE, { ...args, op })
}

// A course board's operations (workers/main.cjs, boardOp). Boards are named
// by their course's code.
type BoardOps = {
  // A student's activity event (SLJ-168).
  activity: [
    { courseId: string; day: number; driveKey: string; eventId: string; payload: ActivityPayload },
    { status: 'added' | 'duplicate' },
  ]
  // The teacher's activity totals for a course.
  activityTotals: [{ driveKey: string }, ActivityWorkerTotals | { closed: true }]
  close: [{ driveKey: string; remove?: boolean }, Record<string, never>]
  moderate: [{ changes: BoardModerationChanges; driveKey: string }, BoardModeration]
  open: [
    { courseId?: string; driveKey: string; messages?: boolean; ownLimitBytes?: number; publicId?: string },
    Record<string, never>,
  ]
  post: [{ driveKey: string; name: string; text: string }, BoardWorkerMessage]
  read: [{ before?: BoardCursor | null; driveKey: string; limit?: number }, BoardWorkerPage]
  readOlder: [{ before: BoardCursor; driveKey: string; limit?: number }, { messages: BoardWorkerMessage[] }]
}

export async function boardOp<K extends keyof BoardOps>(op: K, args: BoardOps[K][0]): Promise<BoardOps[K][1]> {
  return sendCommand<BoardOps[K][1]>(CMD.BOARD, { ...args, op })
}

const boardChangedListeners = new Set<(driveKey: string) => void>()
const activityChangedListeners = new Set<(driveKey: string) => void>()

// Called when the teacher's device counted new activity on a course.
export function onActivityChanged(listener: (driveKey: string) => void): void {
  activityChangedListeners.add(listener)
}

// Called when a course board's messages or moderation list changed.
export function onBoardChanged(listener: (driveKey: string) => void): void {
  boardChangedListeners.add(listener)
}

const maintainerJoinedListeners = new Set<(joined: MaintainerJoined) => void>()

export function onMaintainerJoined(listener: (joined: MaintainerJoined) => void): void {
  maintainerJoinedListeners.add(listener)
}

// The worker's store: everything P2P for the open profile, and no secret
// (SLJ-55). The store for chosen-students-only courses is next to it (`p2p-gated`).
export function getWorkerStoragePath(): string {
  return path.join(getProfileDataDir(), 'p2p')
}

const driveChangedListeners = new Set<(driveKey: string) => void>()

// Called when an imported course's drive may hold a newer version.
export function onDriveChanged(listener: (driveKey: string) => void): void {
  driveChangedListeners.add(listener)
}

// Leaves the swarm for a course: a published one by `courseId`, an imported
// (followed) one by `driveKey`.
export async function stopSharing(target: { courseId: string } | { driveKey: string }): Promise<void> {
  await sendCommand(CMD.STOP_SHARING, target)
}

export async function publishGatedCourse(
  courseId: string,
  version?: string,
): Promise<{ discoveryKey: string; driveKey: string }> {
  const coursePath = await resolveSharedCoursePackagePath(courseId, version)

  const result = await sendCommand<{ discoveryKey?: string; driveKey?: string }>(CMD.PUBLISH_GATED_COURSE, {
    courseId,
    coursePath,
  })

  return { discoveryKey: result.discoveryKey ?? '', driveKey: result.driveKey ?? '' }
}

export async function createInvite(
  courseId: string,
  discoveryKey: string,
  driveKey: string,
  options?: { expiresInMs?: number; maxUses?: number },
): Promise<string> {
  const result = await sendCommand<{ invite?: string }>(CMD.CREATE_INVITE, {
    courseId,
    discoveryKey,
    driveKey,
    expiresInMs: options?.expiresInMs,
    maxUses: options?.maxUses,
  })

  return result.invite ?? ''
}

export async function redeemInvite(invite: string): Promise<{ courseId: string }> {
  const coursesRoot = path.join(getProfileDataDir(), 'courses')

  const result = await sendCommand<{ courseId?: string }>(CMD.REDEEM_INVITE, { coursesRoot, invite })

  return { courseId: result.courseId ?? '' }
}

// No renderer/IPC surface yet (Phase 6's "Share"/"Import" triggers) — this is the
// verification hook the `run-desktop` driver's `main <expr>` command calls directly,
// same idea as Phase 0/1's `globalThis.__*Phase*Status` values.
globalThis.__matkoBareWorker = {
  cancelTransfer,
  checkUpdate,
  createInvite,
  downloadUpdate,
  followCourse,
  getCreatorKey,
  getPeers,
  openIdentity,
  readIdentityBackup,
  findCourse,
  seedCourse,
  getTransfer,
  importCourse,
  publishCourse,
  publishGatedCourse,
  redeemInvite,
  stopSharing,
}

let quitHookInstalled = false

// Stops the worker (SLJ-57: before switching profiles, so the next one starts
// on the new profile's p2p/ store). Resolves once the process has exited;
// calls still waiting for it fail ("Bare worker is not running").
export async function stopBareWorker(): Promise<void> {
  const running = worker
  worker = null
  globalThis.__matkoWorkerStatus = 'stopped'
  await running?.stop()
}

export function spawnBareWorker(): void {
  globalThis.__matkoWorkerStatus = 'spawning'

  try {
    const workerPath = path.join(process.env.APP_ROOT, 'workers/main.cjs')
    const storagePath = getWorkerStoragePath()

    // Test-only: point the worker's swarm at a local DHT testnet instead of the
    // public one (see e2e/sharing-suite.mjs). Unset in the app.
    const bootstrap = process.env.MATKO_DHT_BOOTSTRAP ?? ''
    // Test-only: smaller download limits (workers/download-limits.cjs), as
    // JSON, so an e2e test can cross them with a tiny course. Unset in the app.
    const downloadLimits = process.env.MATKO_DOWNLOAD_LIMITS ?? ''

    // Each event is JSON naming the drive or maintainer it's about.
    const parse = <T>(data: string): T | null => {
      try {
        return JSON.parse(data || '{}') as T
      } catch (error) {
        console.error('[bare-worker] bad event from the worker:', error)
        return null
      }
    }

    worker = startWorker({
      args: downloadLimits ? [storagePath, bootstrap, downloadLimits] : bootstrap ? [storagePath, bootstrap] : [storagePath],
      onError: (error) => {
        globalThis.__matkoWorkerStatus = `error: ${error.message}`
        console.error('[bare-worker] failed to spawn:', error)
      },
      onEvent: (command, data) => {
        if (command === EVENT.MAINTAINER_JOINED) {
          const joined = parse<MaintainerJoined>(data)
          if (joined) for (const listener of maintainerJoinedListeners) listener(joined)
          return
        }
        const driveKey = parse<{ driveKey?: string }>(data)?.driveKey
        if (!driveKey) return
        const listeners =
          command === EVENT.BOARD_CHANGED
            ? boardChangedListeners
            : command === EVENT.ACTIVITY_CHANGED
              ? activityChangedListeners
              : command === EVENT.DRIVE_CHANGED
                ? driveChangedListeners
                : []
        for (const listener of listeners) listener(driveKey)
      },
      onExit: (code, signal) => console.log('[bare-worker] worker exited', { code, signal }),
      onStderr: (text) => console.error('[bare-worker] worker stderr:', text),
      onStdout: (text) => console.log('[bare-worker] worker stdout:', text),
      workerPath,
    })

    getCreatorKey()
      .then(() => {
        globalThis.__matkoWorkerStatus = 'ready'
      })
      .catch((error: Error) => {
        globalThis.__matkoWorkerStatus = `error: ${error.message}`
        console.error('[bare-worker] the worker did not answer:', error)
      })

    if (!quitHookInstalled) {
      quitHookInstalled = true
      app.on('will-quit', () => {
        worker?.kill()
      })
    }
  } catch (error) {
    globalThis.__matkoWorkerStatus = `sync error: ${(error as Error).message}`
    console.error('[bare-worker] synchronous failure:', error)
  }
}
