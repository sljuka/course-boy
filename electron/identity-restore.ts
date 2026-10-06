// Restoring the publisher identity on a new computer (SLJ-54, part 2 of SLJ-42).
//
// 1. The teacher picks the backup file (SLJ-53's `.matko-identity`): the worker
//    checks it and says whose identity it holds and when it was saved.
// 2. With the password, the worker creates a fresh store holding that identity,
//    and it's put in place of this profile's (installRestoredStore). Refused
//    when this profile already put courses online with its own identity:
//    they could never be updated again. Restoring into a new profile is the way.
// 3. Each course in the backup is brought back from its students, in the
//    background, waiting for as long as it takes one of them to come online. It
//    lands as the teacher's own course (versions/<v>/ + draft/ + release.json),
//    and only then is it shared again. So Publish never runs on a course whose
//    history this computer hasn't caught up with: a publish from a shorter
//    history would make a second one, which students' apps refuse.
//
// Earlier versions and changes never published were only on the old computer.
// Worker access, files and timers are passed in, so this has no Electron
// dependency and is unit-tested in identity-restore.test.ts.

import type {
  ChooseIdentityBackupResult,
  IdentityRestoreStatus,
  RestoreIdentityResult,
} from '../src/lib/identity-backup'
import type { TransferInfo } from '../src/lib/sharing'

export type IdentityRestoreState = {
  // The courses in the backup, and whether each is back on this device.
  courses?: { id: string; state: 'restored' | 'waiting'; title: string }[]
  publisherId?: string
  restoredAt?: string
}

export type IdentityRestoreWorker = {
  getTransfer(transferId: string): Promise<TransferInfo | null>
  readIdentityBackup(text: string): Promise<{ createdAt: string; publisherId: string }>
  recoverCourse(
    courseId: string,
    stagingPath: string,
    transferId?: string,
  ): Promise<{ driveKey: string; publisherId: string; version: string }>
  restoreIdentity(input: {
    password: string
    targetPath: string
    text: string
  }): Promise<{ courses: { id: string; title: string }[]; publisherId: string }>
}

export type IdentityRestoreDeps = {
  // The OS open dialog, or null if the teacher cancelled.
  chooseFile(): Promise<string | null>
  readFile(filePath: string): Promise<string>
  // This profile has courses online with its own identity.
  hasPublishedCourses(): Promise<boolean>
  // An empty place for the restored store; then puts it in place of the
  // worker's own and restarts the worker on it.
  prepareRestoredStore(): Promise<string>
  installRestoredStore(): Promise<void>
  // The identity is this profile's now: it counts as consented to sharing and
  // as backed up (by the file it came from).
  onIdentityRestored(identity: { backupCreatedAt: string; courseIds: string[] }): void
  createStagingPath(courseId: string): Promise<string>
  removeStaging(stagingPath: string): Promise<void>
  landCourse(input: { courseId: string; stagingPath: string; version: string }): Promise<void>
  // The course is the teacher's again: record its code and share it.
  onCourseRecovered(courseId: string, driveKey: string): void
  now?: () => Date
  setTimer?: (callback: () => void, delayMs: number) => { cancel(): void }
  store: { read(): IdentityRestoreState; write(state: IdentityRestoreState): void }
  worker: IdentityRestoreWorker
}

// The worker's error codes for a file or password that won't open.
function errorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code
}

// The transfer a course's recovery is tracked under, for its progress.
export function recoveryTransferId(courseId: string): string {
  return `recover-${courseId}`
}

const MAX_BACKUP_FILE_BYTES = 1024 * 1024
const FIRST_RETRY_DELAY_MS = 30_000
const MAX_RETRY_DELAY_MS = 10 * 60_000

function defaultSetTimer(callback: () => void, delayMs: number) {
  const timer = setTimeout(callback, delayMs)
  return { cancel: () => clearTimeout(timer) }
}

export function createIdentityRestoreService(deps: IdentityRestoreDeps) {
  const now = deps.now ?? (() => new Date())
  const setTimer = deps.setTimer ?? defaultSetTimer
  // The file picked in step 1, until the password opens it.
  let chosen: { createdAt: string; text: string } | null = null
  const running = new Set<string>()
  const retries = new Map<string, { attempt: number; timer: { cancel(): void } }>()
  let stopped = false

  function setCourseState(courseId: string, state: 'restored' | 'waiting') {
    const current = deps.store.read()
    deps.store.write({
      ...current,
      courses: (current.courses ?? []).map((course) => (course.id === courseId ? { ...course, state } : course)),
    })
  }

  function scheduleRetry(courseId: string) {
    if (stopped) return
    const attempt = (retries.get(courseId)?.attempt ?? 0) + 1
    const delay = Math.min(FIRST_RETRY_DELAY_MS * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS)
    retries.get(courseId)?.timer.cancel()
    retries.set(courseId, { attempt, timer: setTimer(() => void recover(courseId), delay) })
  }

  // Brings one course back. Never throws: a failure is retried later.
  async function recover(courseId: string): Promise<void> {
    const course = deps.store.read().courses?.find((candidate) => candidate.id === courseId)
    if (stopped || !course || course.state !== 'waiting' || running.has(courseId)) return

    running.add(courseId)
    let stagingPath: string | null = null

    try {
      stagingPath = await deps.createStagingPath(courseId)
      const result = await deps.worker.recoverCourse(courseId, stagingPath, recoveryTransferId(courseId))

      if (result.publisherId !== deps.store.read().publisherId) {
        throw new Error('The course found was published by someone else')
      }

      await deps.landCourse({ courseId, stagingPath, version: result.version })
      stagingPath = null
      setCourseState(courseId, 'restored')
      retries.delete(courseId)
      deps.onCourseRecovered(courseId, result.driveKey)
    } catch (error) {
      if (!stopped) console.error(`[identity-restore] bringing back ${courseId} failed:`, error)
      if (stagingPath) await deps.removeStaging(stagingPath).catch(() => {})
      scheduleRetry(courseId)
    } finally {
      running.delete(courseId)
    }
  }

  function recoverAll() {
    for (const course of deps.store.read().courses ?? []) {
      if (course.state === 'waiting') void recover(course.id)
    }
  }

  return {
    // Step 1: the file, checked. Kept until restore() or the next pick.
    async chooseFile(): Promise<ChooseIdentityBackupResult> {
      const filePath = await deps.chooseFile()
      if (!filePath) return { cancelled: true }

      chosen = null
      let text: string
      try {
        text = await deps.readFile(filePath)
      } catch {
        return { error: 'invalidFile' }
      }
      if (text.length > MAX_BACKUP_FILE_BYTES) return { error: 'invalidFile' }

      try {
        const info = await deps.worker.readIdentityBackup(text)
        chosen = { createdAt: info.createdAt, text }
        return {
          file: {
            createdAt: info.createdAt,
            fileName: filePath.split(/[\\/]/).pop() ?? filePath,
            publisherId: info.publisherId,
          },
        }
      } catch (error) {
        return { error: errorCode(error) === 'UNSUPPORTED_VERSION' ? 'unsupportedVersion' : 'invalidFile' }
      }
    },

    // Step 2: open it with the password, install the identity, and start
    // bringing the courses back (in the background).
    async restore(password: string): Promise<RestoreIdentityResult> {
      if (!chosen) return { error: 'noFile' }
      if (await deps.hasPublishedCourses()) return { error: 'alreadyPublishing' }

      const file = chosen
      let identity: Awaited<ReturnType<IdentityRestoreWorker['restoreIdentity']>>
      try {
        const targetPath = await deps.prepareRestoredStore()
        identity = await deps.worker.restoreIdentity({ password, targetPath, text: file.text })
      } catch (error) {
        if (errorCode(error) === 'WRONG_PASSWORD') return { error: 'wrongPassword' }
        throw error
      }

      // Courses of an earlier restore that never came back belong to that one.
      for (const retry of retries.values()) retry.timer.cancel()
      retries.clear()

      await deps.installRestoredStore()
      chosen = null
      deps.store.write({
        courses: identity.courses.map((course) => ({ id: course.id, state: 'waiting', title: course.title })),
        publisherId: identity.publisherId,
        restoredAt: now().toISOString(),
      })
      deps.onIdentityRestored({
        backupCreatedAt: file.createdAt,
        courseIds: identity.courses.map((course) => course.id),
      })
      recoverAll()

      return { restored: { courseCount: identity.courses.length } }
    },

    async getStatus(): Promise<IdentityRestoreStatus> {
      const state = deps.store.read()
      if (!state.publisherId || !state.restoredAt) return null

      const courses = await Promise.all(
        (state.courses ?? []).map(async (course) => ({
          ...course,
          transfer:
            course.state === 'waiting'
              ? await deps.worker.getTransfer(recoveryTransferId(course.id)).catch(() => null)
              : null,
        })),
      )
      return { courses, publisherId: state.publisherId, restoredAt: state.restoredAt }
    },

    // At profile start: carry on with courses not back yet.
    resume(): void {
      recoverAll()
    },

    // Another profile is being opened: no more retries.
    stop(): void {
      stopped = true
      for (const retry of retries.values()) retry.timer.cancel()
      retries.clear()
      chosen = null
    },
  }
}

export type IdentityRestoreService = ReturnType<typeof createIdentityRestoreService>
