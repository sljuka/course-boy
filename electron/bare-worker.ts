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
import { getPublishedCoursePackagePath } from './course-paths'
import { isValidCourseId } from '../src/lib/course-id'
import type { RemoteCourseVersion } from './course-sharing'

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
// Sent by the worker to main (the only worker → main message).
const EVENT_DRIVE_CHANGED = 100

declare global {
  var __creatorPublicKeyPhase1: string
  var __matkoBareWorker: {
    createInvite: typeof createInvite
    checkUpdate: typeof checkUpdate
    downloadUpdate: typeof downloadUpdate
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
    ? path.join(app.getPath('userData'), 'courses', courseId, 'versions', version)
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
  const result = JSON.parse(reply ? reply.toString() : '{}') as T & { error?: string }

  if (result.error) {
    throw new Error(result.error)
  }

  return result
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

export async function importCourse(driveKey: string): Promise<ImportedCourseSource> {
  const coursesRoot = path.join(app.getPath('userData'), 'courses')
  const result = await sendCommand<Partial<ImportedCourseSource>>(CMD_IMPORT_COURSE, {
    coursesRoot,
    driveKey,
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
export async function downloadUpdate(driveKey: string, targetPath: string): Promise<DownloadedUpdate> {
  return sendCommand<DownloadedUpdate>(CMD_DOWNLOAD_UPDATE, { driveKey, targetPath })
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
  const coursesRoot = path.join(app.getPath('userData'), 'courses')

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
  checkUpdate,
  createInvite,
  downloadUpdate,
  followCourse,
  getCreatorKey,
  importCourse,
  publishCourse,
  publishGatedCourse,
  redeemInvite,
  stopSharing,
}

export function spawnBareWorker(): void {
  globalThis.__creatorPublicKeyPhase1 = 'spawning'

  try {
    const workerPath = path.join(process.env.APP_ROOT, 'workers/main.cjs')
    const storagePath = path.join(app.getPath('userData'), 'p2p')

    // Test-only: point the worker's swarm at a local DHT testnet instead of the
    // public one (see e2e/sharing.e2e.mjs). Unset in the app.
    const bootstrap = process.env.MATKO_DHT_BOOTSTRAP ?? ''

    const worker = spawnBare('bare', {
      args: bootstrap ? [workerPath, storagePath, bootstrap] : [workerPath, storagePath],
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    })

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

    app.on('will-quit', () => {
      worker.kill()
    })
  } catch (error) {
    globalThis.__creatorPublicKeyPhase1 = `sync error: ${(error as Error).message}`
    console.error('[bare-worker] synchronous failure:', error)
  }
}
