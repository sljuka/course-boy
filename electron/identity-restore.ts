// Restoring the publisher identity on a new computer (SLJ-54, SLJ-55).
//
// 1. The teacher picks a copy of their identity file (`.matko-identity`): the
//    worker checks it and says whose identity it holds and when it was made.
// 2. With the password, the worker opens it and it becomes this profile's
//    identity file (publisher-identity.ts). Refused when this profile already
//    put courses online with another identity: they could never be updated
//    again. Restoring into a new profile is the way. The same identity again
//    is fine, and its courses already here count as found.
// 3. The courses are found from the identity alone: course number n = 0, 1,
//    2… has a public id and code derived from it (workers/identity-keys.cjs),
//    so each number is looked up among students, many at once. A course found
//    lands as the teacher's own (versions/<v>/ + draft/ + release.json) and
//    only then is shared again, so Publish never runs on a history this
//    computer hasn't caught up with (a shorter one would fork the course for
//    every student). The search stops after GAP_LIMIT numbers in a row aren't
//    found, like a wallet's gap limit: a deleted course is just a gap. "Look
//    again" searches again, for courses nobody had online the first time.
//
// Programs (SLJ-32) are found the same way, on their own numbers
// (publicProgramId), once the courses' search is done: each lands as the
// teacher's own program and is shared again by its code.
//
// Earlier versions and changes never published were only on the old computer.
// Worker access, files and timers are passed in, so this has no Electron
// dependency and is unit-tested in identity-restore.test.ts.

import type {
  ChooseIdentityFileResult,
  IdentityRestoreStatus,
  RestoreIdentityResult,
} from '../src/lib/publisher-identity'

type FoundEntry = { id: string; publicIndex: number; title: string }

export type IdentityRestoreState = {
  // The courses and programs found and back on this device.
  courses?: FoundEntry[]
  programs?: FoundEntry[]
  publisherId?: string
  restoredAt?: string
}

export type FoundCourse = {
  courseId: string
  driveKey: string
  // It moved to a course shared by several maintainers (SLJ-11).
  movedTo?: string | null
  publicId: string
  publisherId: string
  version: string
}

export type FoundProgram = {
  driveKey: string
  programId: string
  publicId: string
  publisherId: string
}

type FindInput = { index: number; stagingPath: string; timeoutMs: number; transferId?: string }

export type IdentityRestoreWorker = {
  findCourse(input: FindInput): Promise<FoundCourse>
  findProgram(input: FindInput): Promise<FoundProgram>
  openIdentity(text: string, password: string): Promise<{ key: Buffer; publisherId: string }>
  readIdentityBackup(text: string): Promise<{ createdAt: string; publisherId: string }>
}

export type IdentityRestoreDeps = {
  // The OS open dialog, or null if the teacher cancelled.
  chooseFile(): Promise<string | null>
  readFile(filePath: string): Promise<string>
  // This profile has courses online with its own identity.
  hasPublishedCourses(): Promise<boolean>
  // This profile's publisher id, if it has an identity.
  currentPublisherId(): string | null
  // Makes the opened identity file this profile's, and unlocks it.
  installIdentity(text: string, key: Buffer): Promise<void>
  // The course's title, if it's on this device already.
  courseOnDevice(courseId: string): Promise<{ title: string } | null>
  createStagingPath(): Promise<string>
  removeStaging(stagingPath: string): Promise<void>
  landCourse(input: { courseId: string; stagingPath: string; version: string }): Promise<{ title: string }>
  // The course is the teacher's (again): record its number and code, and share it.
  onCourseFound(course: { courseId: string; driveKey: string; publicId: string; publicIndex: number }): void
  // A course that moved to a shared one (SLJ-11): lands the shared course's
  // latest version and takes up maintaining it again (the old drive only
  // holds the version from before the move).
  landSharedCourse(input: { oldCode: string; publicId: string; publicIndex: number; sharedKey: string }): Promise<{
    courseId: string
    title: string
  }>
  // The same for programs.
  programOnDevice(programId: string): Promise<{ title: string } | null>
  landProgram(input: { programId: string; stagingPath: string }): Promise<{ title: string }>
  onProgramFound(program: { driveKey: string; programId: string; publicId: string; publicIndex: number }): void
  now?: () => Date
  // How long one course number is looked for among students.
  lookupTimeoutMs?: number
  // Numbers not found in a row before the search stops (GAP_LIMIT).
  gapLimit?: number
  store: { read(): IdentityRestoreState; write(state: IdentityRestoreState): void }
  worker: IdentityRestoreWorker
}

function errorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code
}

// Numbers not found in a row before the search stops.
export const GAP_LIMIT = 20
// How many numbers are looked up at once: enough to finish soon, few enough
// not to crowd the DHT lookups out.
const LOOKUPS_AT_ONCE = 10
const DEFAULT_LOOKUP_TIMEOUT_MS = 30_000
const MAX_FILE_BYTES = 1024 * 1024

type Kind = 'course' | 'program'

export function createIdentityRestoreService(deps: IdentityRestoreDeps) {
  const now = deps.now ?? (() => new Date())
  const lookupTimeoutMs = deps.lookupTimeoutMs ?? DEFAULT_LOOKUP_TIMEOUT_MS
  const gapLimit = deps.gapLimit ?? GAP_LIMIT
  // The file picked in step 1, until the password opens it.
  let chosen: { createdAt: string; publisherId: string; text: string } | null = null
  let searching: Promise<void> | null = null
  let stopped = false

  function record(kind: Kind, entry: FoundEntry) {
    const state = deps.store.read()
    const key = kind === 'course' ? 'courses' : 'programs'
    const others = (state[key] ?? []).filter((candidate) => candidate.id !== entry.id)
    deps.store.write({ ...state, [key]: [...others, entry] })
  }

  // Lands what the worker found for number `index`, unless it's here already.
  // Returns its id and title, and whether the staging folder was used up.
  async function land(kind: Kind, index: number, stagingPath: string): Promise<{ consumed: boolean; id: string; title: string }> {
    const timeoutMs = lookupTimeoutMs
    const transferId = `find-${kind}-${index}`

    if (kind === 'course') {
      const found = await deps.worker.findCourse({ index, stagingPath, timeoutMs, transferId })
      assertOwn(found.publisherId, 'course')
      if (found.movedTo) {
        const shared = await deps.landSharedCourse({
          oldCode: found.driveKey,
          publicId: found.publicId,
          publicIndex: index,
          sharedKey: found.movedTo,
        })
        return { consumed: false, id: shared.courseId, title: shared.title }
      }
      // The same identity restored again: the course never left.
      const onDevice = await deps.courseOnDevice(found.courseId)
      const title = onDevice?.title ?? (await deps.landCourse({ courseId: found.courseId, stagingPath, version: found.version })).title
      deps.onCourseFound({ courseId: found.courseId, driveKey: found.driveKey, publicId: found.publicId, publicIndex: index })
      return { consumed: !onDevice, id: found.courseId, title }
    }

    const found = await deps.worker.findProgram({ index, stagingPath, timeoutMs, transferId })
    assertOwn(found.publisherId, 'program')
    const onDevice = await deps.programOnDevice(found.programId)
    const title = onDevice?.title ?? (await deps.landProgram({ programId: found.programId, stagingPath })).title
    deps.onProgramFound({ driveKey: found.driveKey, programId: found.programId, publicId: found.publicId, publicIndex: index })
    return { consumed: !onDevice, id: found.programId, title }
  }

  function assertOwn(publisherId: string, kind: Kind) {
    if (publisherId !== deps.store.read().publisherId) {
      throw new Error(`The ${kind} found was published by someone else`)
    }
  }

  // Is number `index` online? Lands it if so. Never throws.
  async function lookUp(kind: Kind, index: number): Promise<boolean> {
    let stagingPath: string | null = null

    try {
      stagingPath = await deps.createStagingPath()
      const { consumed, id, title } = await land(kind, index, stagingPath)
      if (consumed) stagingPath = null // landing used it up
      record(kind, { id, publicIndex: index, title })
      return true
    } catch (error) {
      if (!stopped && errorCode(error) !== 'NOT_FOUND') {
        console.error(`[identity-restore] looking for ${kind} #${index} failed:`, error)
      }
      return false
    } finally {
      if (stagingPath) await deps.removeStaging(stagingPath).catch(() => {})
    }
  }

  // Numbers from 0, several at once, until GAP_LIMIT in a row aren't found.
  async function searchKind(kind: Kind): Promise<void> {
    let next = 0
    let lastFound = -1
    const running = new Set<Promise<void>>()

    while (!stopped) {
      while (!stopped && next <= lastFound + gapLimit && running.size < LOOKUPS_AT_ONCE) {
        const index = next++
        const lookup: Promise<void> = lookUp(kind, index).then((found) => {
          if (found) lastFound = Math.max(lastFound, index)
          running.delete(lookup)
        })
        running.add(lookup)
      }
      if (running.size === 0) break
      await Promise.race(running)
    }
  }

  // Courses first, then programs: both at once would double the lookups
  // and crowd the DHT (courses then went unfound in the e2e test).
  async function search(): Promise<void> {
    await searchKind('course')
    await searchKind('program')
  }

  function startSearch(): void {
    if (searching || stopped) return
    searching = search().finally(() => {
      searching = null
    })
  }

  return {
    // Step 1: the file, checked. Kept until restore() or the next pick.
    async chooseFile(): Promise<ChooseIdentityFileResult> {
      const filePath = await deps.chooseFile()
      if (!filePath) return { cancelled: true }

      chosen = null
      let text: string
      try {
        text = await deps.readFile(filePath)
      } catch {
        return { error: 'invalidFile' }
      }
      if (text.length > MAX_FILE_BYTES) return { error: 'invalidFile' }

      try {
        const info = await deps.worker.readIdentityBackup(text)
        chosen = { createdAt: info.createdAt, publisherId: info.publisherId, text }
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

    // Step 2: open it with the password, make it this profile's identity, and
    // search for the courses (in the background).
    async restore(password: string): Promise<RestoreIdentityResult> {
      if (!chosen) return { error: 'noFile' }
      if (deps.currentPublisherId() !== chosen.publisherId && (await deps.hasPublishedCourses())) {
        return { error: 'alreadyPublishing' }
      }

      const file = chosen
      let opened: Awaited<ReturnType<IdentityRestoreWorker['openIdentity']>>
      try {
        opened = await deps.worker.openIdentity(file.text, password)
      } catch (error) {
        if (errorCode(error) === 'WRONG_PASSWORD') return { error: 'wrongPassword' }
        throw error
      }

      await deps.installIdentity(file.text, opened.key)
      chosen = null
      deps.store.write({ courses: [], programs: [], publisherId: opened.publisherId, restoredAt: now().toISOString() })
      startSearch()

      return { restored: true }
    },

    // "Look again": for courses nobody who has them was online the first time.
    searchAgain(): void {
      if (deps.store.read().publisherId) startSearch()
    },

    getStatus(): IdentityRestoreStatus {
      const state = deps.store.read()
      if (!state.publisherId || !state.restoredAt) return null

      const inOrder = (entries: FoundEntry[] = []) =>
        entries
          .slice()
          .sort((left, right) => left.publicIndex - right.publicIndex)
          .map(({ id, title }) => ({ id, title }))
      return {
        courses: inOrder(state.courses),
        programs: inOrder(state.programs),
        publisherId: state.publisherId,
        restoredAt: state.restoredAt,
        searching: searching !== null,
      }
    },

    // Resolves when the current search is done (tests).
    whenSearched(): Promise<void> {
      return searching ?? Promise.resolve()
    },

    // Another profile is being opened: stop searching.
    stop(): void {
      stopped = true
      chosen = null
    },
  }
}

export type IdentityRestoreService = ReturnType<typeof createIdentityRestoreService>
