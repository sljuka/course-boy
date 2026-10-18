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
import spawnBare from 'bare-runtime/spawn'
import RPC from 'bare-rpc'
import { app } from 'electron'
import { getProfileDataDir } from './profile-context'
import { getPublishedCoursePackagePath } from './course-paths'
import { isValidCourseId } from '../src/lib/course-id'
import type { RemoteCourseVersion } from './course-sharing'
import type { TransferInfo } from '../src/lib/sharing'

// Must match workers/main.cjs.
const CMD_GET_CREATOR_KEY = 1
const CMD_PUBLISH_COURSE = 2
const CMD_IMPORT_COURSE = 3
const CMD_PUBLISH_GATED_COURSE = 4
const CMD_CREATE_INVITE = 5
const CMD_REDEEM_INVITE = 6
const CMD_FOLLOW_COURSE = 7
const CMD_STOP_SHARING = 8
const CMD_CHECK_UPDATE = 9
const CMD_DOWNLOAD_UPDATE = 10
const CMD_GET_TRANSFER = 11
const CMD_CANCEL_TRANSFER = 12
const CMD_GET_PEERS = 13
const CMD_READ_IDENTITY_BACKUP = 15
const CMD_OPEN_IDENTITY = 16
const CMD_FIND_COURSE = 17
const CMD_SET_IDENTITY = 18
const CMD_SEAL_IDENTITY = 19
const CMD_SEED_COURSE = 20
const CMD_PUBLISH_PROGRAM = 21
const CMD_SEED_PROGRAM = 22
const CMD_PEEK_COURSE = 23
const CMD_FIND_PROGRAM = 24
// Courses shared by several maintainers (SLJ-11): one command, `op` names the operation.
const CMD_SHARED_COURSE = 25
// Sent by the worker to main (the only worker → main message).
const EVENT_DRIVE_CHANGED = 100
// Worker → main: someone joined as a maintainer with one of our invites.
const EVENT_MAINTAINER_JOINED = 101

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

let rpc: RPC | null = null
// The running worker process, so a profile switch can stop it (stopBareWorker).
let workerProcess: ReturnType<typeof spawnBare> | null = null

function requireRpc(): RPC {
  if (!rpc) {
    throw new Error('Bare worker is not running')
  }

  return rpc
}

// The publisher id while the identity is unlocked in the worker, else ''.
// The app's own publisher id comes from main (publisher-identity.ts), which
// knows it while locked too; this is the worker's answer, used at start to
// know it runs.
export async function getCreatorKey(): Promise<string> {
  const request = requireRpc().request(CMD_GET_CREATOR_KEY)
  request.send()

  const reply = await request.reply('utf-8')
  return reply ? reply.toString() : ''
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
async function sendCommand<T>(command: number, payload: unknown): Promise<T> {
  const request = requireRpc().request(command)
  request.send(JSON.stringify(payload))

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as T & { code?: string; error?: string }

  if (result.error) {
    // `code` carries e.g. CANCELLED (a transfer the user stopped) to the caller.
    // `fromWorker`: the worker answered with it, unlike a worker that stopped
    // (the app quitting) and never answered.
    throw Object.assign(new Error(result.error), { code: result.code, fromWorker: true })
  }

  return result
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
  return sendCommand<{ driveKey: string; publicId: string }>(CMD_PUBLISH_COURSE, {
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
  const result = await sendCommand<Partial<ImportedCourseSource>>(CMD_IMPORT_COURSE, {
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
  return sendCommand(CMD_PUBLISH_PROGRAM, { programId, programPath, publicIndex, publisherName })
}

// Shares a published program by its code while the identity is locked.
export async function seedProgram(programId: string, driveKey: string): Promise<void> {
  await sendCommand(CMD_SEED_PROGRAM, { driveKey, programId })
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
  return sendCommand(CMD_PEEK_COURSE, { driveKey, withContents })
}

// Reopens an imported course's drive and announces it again (after a restart).
export async function followCourse(driveKey: string): Promise<void> {
  await sendCommand(CMD_FOLLOW_COURSE, { driveKey })
}

// Which version an imported course's drive holds now, from its small files
// (course.json, changelog.json, source.json); nothing else is downloaded.
export async function checkUpdate(driveKey: string): Promise<RemoteCourseVersion> {
  return sendCommand<RemoteCourseVersion>(CMD_CHECK_UPDATE, { driveKey })
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
  return sendCommand<DownloadedUpdate>(CMD_DOWNLOAD_UPDATE, { driveKey, targetPath, transferId })
}

export async function getTransfer(transferId: string): Promise<TransferInfo | null> {
  return (await sendCommand<{ transfer: TransferInfo | null }>(CMD_GET_TRANSFER, { transferId })).transfer
}

export async function cancelTransfer(transferId: string): Promise<void> {
  await sendCommand(CMD_CANCEL_TRANSFER, { transferId })
}

// Peers connected for a course shared from this device (your own by course id,
// an imported one by drive key); null when it isn't shared here right now.
export async function getPeers(target: { courseId: string } | { driveKey: string }): Promise<number | null> {
  return (await sendCommand<{ peers: number | null }>(CMD_GET_PEERS, target)).peers
}

export type IdentityBackupInfo = { createdAt: string; publisherId: string }

// The backup file's public part, checked by the worker (it owns the format):
// who it belongs to and when it was saved. Fails with `code` INVALID_FILE or
// UNSUPPORTED_VERSION.
export async function readIdentityBackup(text: string): Promise<IdentityBackupInfo> {
  return sendCommand<IdentityBackupInfo>(CMD_READ_IDENTITY_BACKUP, { text })
}

// The publisher identity (SLJ-55) is kept by main (electron/publisher-identity.ts)
// and handed to the worker in memory; null takes it back (locked). Returns the
// publisher id it signs as.
export async function setIdentity(key: Buffer | null): Promise<string | null> {
  return (await sendCommand<{ publisherId: string | null }>(CMD_SET_IDENTITY, { key: key?.toString('base64') ?? null }))
    .publisherId
}

// The identity locked with `password`, in the backup file's format (no courses).
export async function sealIdentity(key: Buffer, password: string): Promise<string> {
  return (await sendCommand<{ sealed: string }>(CMD_SEAL_IDENTITY, { key: key.toString('base64'), password })).sealed
}

export type OpenedIdentity = { courses: { id: string; title: string }[]; key: Buffer; publisherId: string }

// Opens a backup file, or main's password-locked copy, with `password`. Fails
// with `code` WRONG_PASSWORD on a wrong password, INVALID_FILE on a damaged file.
export async function openIdentity(text: string, password: string): Promise<OpenedIdentity> {
  const result = await sendCommand<{ courses: OpenedIdentity['courses']; key: string; publisherId: string }>(
    CMD_OPEN_IDENTITY,
    { password, text },
  )
  return { courses: result.courses, key: Buffer.from(result.key, 'base64'), publisherId: result.publisherId }
}

// Shares a published course by its code without the identity (locked):
// students can still download it; a new version needs the identity.
export async function seedCourse(courseId: string, driveKey: string): Promise<void> {
  await sendCommand(CMD_SEED_COURSE, { courseId, driveKey })
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
  return sendCommand<FoundCourse>(CMD_FIND_COURSE, input)
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
  return sendCommand<FoundProgram>(CMD_FIND_PROGRAM, input)
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
  return sendCommand<SharedCourseOps[K][1]>(CMD_SHARED_COURSE, { ...args, op })
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
  await sendCommand(CMD_STOP_SHARING, target)
}

export async function publishGatedCourse(
  courseId: string,
  version?: string,
): Promise<{ discoveryKey: string; driveKey: string }> {
  const coursePath = await resolveSharedCoursePackagePath(courseId, version)

  const request = requireRpc().request(CMD_PUBLISH_GATED_COURSE)
  request.send(JSON.stringify({ courseId, coursePath }))

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as {
    discoveryKey?: string
    driveKey?: string
    error?: string
  }

  if (result.error) {
    throw new Error(result.error)
  }

  return { discoveryKey: result.discoveryKey ?? '', driveKey: result.driveKey ?? '' }
}

export async function createInvite(
  courseId: string,
  discoveryKey: string,
  driveKey: string,
  options?: { expiresInMs?: number; maxUses?: number },
): Promise<string> {
  const request = requireRpc().request(CMD_CREATE_INVITE)
  request.send(
    JSON.stringify({
      courseId,
      discoveryKey,
      driveKey,
      expiresInMs: options?.expiresInMs,
      maxUses: options?.maxUses,
    }),
  )

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as {
    error?: string
    invite?: string
  }

  if (result.error) {
    throw new Error(result.error)
  }

  return result.invite ?? ''
}

export async function redeemInvite(invite: string): Promise<{ courseId: string }> {
  const coursesRoot = path.join(getProfileDataDir(), 'courses')

  const request = requireRpc().request(CMD_REDEEM_INVITE)
  request.send(JSON.stringify({ coursesRoot, invite }))

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as {
    courseId?: string
    error?: string
  }

  if (result.error) {
    throw new Error(result.error)
  }

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
  const worker = workerProcess
  workerProcess = null
  rpc = null
  globalThis.__matkoWorkerStatus = 'stopped'

  if (!worker || worker.exitCode !== null || worker.signalCode !== null) {
    return
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      worker.kill('SIGKILL')
      resolve()
    }, 5_000)
    worker.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
    worker.kill()
  })
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

    const worker = spawnBare('bare', {
      args: downloadLimits
        ? [workerPath, storagePath, bootstrap, downloadLimits]
        : bootstrap
          ? [workerPath, storagePath, bootstrap]
          : [workerPath, storagePath],
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    })
    workerProcess = worker

    worker.on('error', (error) => {
      globalThis.__matkoWorkerStatus = `error: ${error.message}`
      console.error('[bare-worker] failed to spawn:', error)
    })

    worker.on('exit', (code, signal) => {
      console.log('[bare-worker] worker exited', { code, signal })
    })

    worker.stdout?.on('data', (chunk: Buffer) => {
      console.log('[bare-worker] worker stdout:', chunk.toString())
    })

    worker.stderr?.on('data', (chunk: Buffer) => {
      console.error('[bare-worker] worker stderr:', chunk.toString())
    })

    // Node's own child_process types don't capture that an extra 'pipe' stdio slot
    // (beyond stdin/stdout/stderr) is actually a full-duplex Socket at runtime — and
    // bare-rpc's own Duplex type (from `bare-stream`) declares Bare-internal members a
    // Node Socket doesn't structurally have, even though it satisfies bare-rpc's actual
    // (duck-typed) runtime usage. Double-cast through `unknown` for that boundary.
    const controlPipe = worker.stdio[3] as unknown as ConstructorParameters<typeof RPC>[0]
    rpc = new RPC(controlPipe, (req) => {
      if (req.command === EVENT_MAINTAINER_JOINED) {
        try {
          const joined = JSON.parse(req.data?.toString() ?? '{}') as MaintainerJoined
          for (const listener of maintainerJoinedListeners) listener(joined)
        } catch (error) {
          console.error('[bare-worker] bad maintainer-joined event:', error)
        }
      }
      if (req.command === EVENT_DRIVE_CHANGED) {
        try {
          const { driveKey } = JSON.parse(req.data?.toString() ?? '{}') as { driveKey?: string }
          if (driveKey) {
            for (const listener of driveChangedListeners) listener(driveKey)
          }
        } catch (error) {
          console.error('[bare-worker] bad drive-changed event:', error)
        }
      }
      req.reply('')
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
        workerProcess?.kill()
      })
    }
  } catch (error) {
    globalThis.__matkoWorkerStatus = `sync error: ${(error as Error).message}`
    console.error('[bare-worker] synchronous failure:', error)
  }
}
