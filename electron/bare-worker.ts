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
import { rename, rm } from 'node:fs/promises'
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
const CMD_CREATE_IDENTITY_BACKUP = 14
const CMD_READ_IDENTITY_BACKUP = 15
const CMD_RESTORE_IDENTITY = 16
const CMD_RECOVER_COURSE = 17
// Sent by the worker to main (the only worker → main message).
const EVENT_DRIVE_CHANGED = 100

declare global {
  var __creatorPublicKeyPhase1: string
  var __matkoBareWorker: {
    createInvite: typeof createInvite
    cancelTransfer: typeof cancelTransfer
    checkUpdate: typeof checkUpdate
    downloadUpdate: typeof downloadUpdate
    getTransfer: typeof getTransfer
    getPeers: typeof getPeers
    createIdentityBackup: typeof createIdentityBackup
    readIdentityBackup: typeof readIdentityBackup
    recoverCourse: typeof recoverCourse
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
async function sendCommand<T>(command: number, payload: unknown): Promise<T> {
  const request = requireRpc().request(command)
  request.send(JSON.stringify(payload))

  const reply = await request.reply('utf-8')
  const result = JSON.parse(reply ? reply.toString() : '{}') as T & { code?: string; error?: string }

  if (result.error) {
    // `code` carries e.g. CANCELLED (a transfer the user stopped) to the caller.
    throw Object.assign(new Error(result.error), { code: result.code })
  }

  return result
}

export function isCancelledError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'CANCELLED'
}

// Mirrors the course's *current published version* into its drive (plus
// source.json) and announces it. Returns the drive key — the course's code, which
// is the same for every version.
export async function publishCourse(courseId: string): Promise<string> {
  const coursePath = await resolveSharedCoursePackagePath(courseId)
  const result = await sendCommand<{ driveKey?: string }>(CMD_PUBLISH_COURSE, {
    courseId,
    coursePath,
  })

  return result.driveKey ?? ''
}

export type ImportedCourseSource = {
  courseId: string
  driveKey: string
  // Claimed by the course's source.json; unverified until SLJ-18.
  publisherId: string
}

// `transferId`: to poll progress (getTransfer) and cancel (cancelTransfer).
export async function importCourse(driveKey: string, transferId?: string): Promise<ImportedCourseSource> {
  const coursesRoot = path.join(getProfileDataDir(), 'courses')
  const result = await sendCommand<Partial<ImportedCourseSource>>(CMD_IMPORT_COURSE, {
    coursesRoot,
    driveKey,
    transferId,
  })

  return {
    courseId: result.courseId ?? '',
    driveKey: result.driveKey ?? '',
    publisherId: result.publisherId ?? '',
  }
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

// The publisher identity backup file's contents (SLJ-53), encrypted in the
// worker with `password`; see workers/identity-backup.cjs.
export async function createIdentityBackup(input: {
  courses: { id: string; title: string }[]
  password: string
}): Promise<string> {
  return (await sendCommand<{ backup: string }>(CMD_CREATE_IDENTITY_BACKUP, input)).backup
}

export type IdentityBackupInfo = { createdAt: string; publisherId: string }

// The backup file's public part, checked by the worker (it owns the format):
// who it belongs to and when it was saved. Fails with `code` INVALID_FILE or
// UNSUPPORTED_VERSION.
export async function readIdentityBackup(text: string): Promise<IdentityBackupInfo> {
  return sendCommand<IdentityBackupInfo>(CMD_READ_IDENTITY_BACKUP, { text })
}

export type RestoredIdentity = { courses: { id: string; title: string }[]; publisherId: string }

// Opens the backup with `password` and creates a new store at `targetPath`
// holding its identity (SLJ-54); see installRestoredStore. The key never
// leaves the worker. Fails with `code` WRONG_PASSWORD on a wrong password.
export async function restoreIdentity(input: {
  password: string
  targetPath: string
  text: string
}): Promise<RestoredIdentity> {
  return sendCommand<RestoredIdentity>(CMD_RESTORE_IDENTITY, input)
}

export type RecoveredCourse = { driveKey: string; publisherId: string; version: string }

// Downloads the published version of a course of this identity into
// `stagingPath`, from the students who have it; waits (phase "finding") until
// one is online. `transferId`: to poll progress and cancel.
export async function recoverCourse(courseId: string, stagingPath: string, transferId?: string): Promise<RecoveredCourse> {
  return sendCommand<RecoveredCourse>(CMD_RECOVER_COURSE, { courseId, stagingPath, transferId })
}

// The worker's store: everything P2P for the open profile. The store for
// chosen-students-only courses is next to it (`p2p-gated`).
export function getWorkerStoragePath(): string {
  return path.join(getProfileDataDir(), 'p2p')
}

// Where restoreIdentity creates the new store before it's put in place.
export function getRestoredStoragePath(): string {
  return path.join(getProfileDataDir(), 'p2p-restore')
}

// Puts the restored store in place of the worker's (SLJ-54): stop the worker,
// swap the folders, start it again on the restored identity. The old store
// goes: restoring is refused while it has published anything (its identity
// would be lost), so it holds at most imported courses' cached data, which
// is fetched again when needed.
export async function installRestoredStore(): Promise<void> {
  const storagePath = getWorkerStoragePath()
  const replacedPath = `${storagePath}-replaced-${Date.now()}`

  await stopBareWorker()
  await rename(storagePath, replacedPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
  await rename(getRestoredStoragePath(), storagePath)
  spawnBareWorker()
  await rm(replacedPath, { force: true, recursive: true }).catch(() => {})
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
  createIdentityBackup,
  getPeers,
  readIdentityBackup,
  recoverCourse,
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
  globalThis.__creatorPublicKeyPhase1 = 'stopped'

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
  globalThis.__creatorPublicKeyPhase1 = 'spawning'

  try {
    const workerPath = path.join(process.env.APP_ROOT, 'workers/main.cjs')
    const storagePath = getWorkerStoragePath()

    // Test-only: point the worker's swarm at a local DHT testnet instead of the
    // public one (see e2e/sharing.e2e.mjs). Unset in the app.
    const bootstrap = process.env.MATKO_DHT_BOOTSTRAP ?? ''

    const worker = spawnBare('bare', {
      args: bootstrap ? [workerPath, storagePath, bootstrap] : [workerPath, storagePath],
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    })
    workerProcess = worker

    worker.on('error', (error) => {
      globalThis.__creatorPublicKeyPhase1 = `error: ${error.message}`
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
      .then((key) => {
        globalThis.__creatorPublicKeyPhase1 = key
        console.log('[bare-worker] creator key:', key)
      })
      .catch((error: Error) => {
        globalThis.__creatorPublicKeyPhase1 = `error: ${error.message}`
        console.error('[bare-worker] failed to get creator key:', error)
      })

    if (!quitHookInstalled) {
      quitHookInstalled = true
      app.on('will-quit', () => {
        workerProcess?.kill()
      })
    }
  } catch (error) {
    globalThis.__creatorPublicKeyPhase1 = `sync error: ${(error as Error).message}`
    console.error('[bare-worker] synchronous failure:', error)
  }
}
