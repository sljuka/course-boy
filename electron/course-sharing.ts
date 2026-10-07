// Keeps courses shared across restarts (SLJ-38, part 1 of SLJ-9).
//
// - A teacher's published courses: Publish puts the current published version
//   online (there is no separate Share action). At startup every published course
//   is shared again. Nothing is shared until the teacher has given the one-time
//   sharing consent (`hasAcknowledgedCreatorKey`).
// - A student's imported courses ("followed"): where each came from is recorded
//   once, at import, and the course is announced again at every startup so
//   students keep sharing it with each other.
//
// Sharing never makes Publish fail: a failed attempt leaves the course "waiting"
// and is retried with a growing delay.
//
// Updates (SLJ-39): when a followed course's drive holds a newer version, it's
// offered to the student (never applied silently) and applied on request,
// atomically (`applyImportedCourseUpdate` in course-paths.ts).
//
// Worker access, storage and timers are passed in, so this has no Electron
// dependency and is unit-tested in course-sharing.test.ts.

import type { CourseChangelogEntry } from '../src/lib/course-package'
import { compareCourseVersions, parseCourseVersion } from '../src/lib/course-versioning'
import type {
  Cancelled,
  CourseSharingInfo,
  CourseSharingStatus,
  CourseUpdateInfo,
} from '../src/lib/sharing'

export type PendingCourseUpdate = {
  changelog: CourseChangelogEntry[]
  isMajor: boolean
  recommended: boolean
  version: string
}

export type FollowedCourse = {
  driveKey: string
  followedSince: string
  // Shared by the teacher with chosen students only (blind-pairing invites,
  // not in the UI yet): its key must not be handed on, so the student gets no
  // code to share. Courses imported with a code are public: unset.
  gated?: boolean
  // Claimed by the course's source.json; unverified until SLJ-18. Stored, not shown.
  publisherId: string
  // The newest valid newer version the drive offers, if any.
  pendingUpdate?: PendingCourseUpdate | null
  // A newer version refused because its source.json names another source.
  refusedUpdate?: { version: string } | null
  // "Finish on this version": regular updates stop being shown prominently.
  finishOnVersion?: boolean
  // The update the student dismissed with "Finish on this version"; a newer
  // recommended one is shown again.
  dismissedUpdateVersion?: string | null
}

export type RemoteCourseVersion = {
  changelog: CourseChangelogEntry[]
  courseId: string | null
  source: { driveKey?: unknown; publisher?: { id?: unknown } } | null
  version: string | null
}

export type RemoteVersionVerdict =
  | { kind: 'none' }
  | { kind: 'refused'; version: string }
  | { kind: 'update'; update: PendingCourseUpdate }

function isNewer(version: string, than: string): boolean {
  return compareCourseVersions(parseCourseVersion(version), parseCourseVersion(than)) > 0
}

// What a followed course's drive offers, compared with the installed version.
// Only a strictly newer version of the same course counts, and only from the
// source recorded at import; otherwise it's refused. "Recommended" if any
// version the student would skip fixes mistakes.
export function evaluateRemoteVersion(
  courseId: string,
  followed: Pick<FollowedCourse, 'driveKey' | 'publisherId'>,
  remote: RemoteCourseVersion,
  installedVersion: string,
): RemoteVersionVerdict {
  const remoteVersion = remote.version

  try {
    if (remote.courseId !== courseId || !remoteVersion || !isNewer(remoteVersion, installedVersion)) {
      return { kind: 'none' }
    }
  } catch {
    return { kind: 'none' } // a version we can't parse
  }

  if (remote.source?.driveKey !== followed.driveKey || remote.source?.publisher?.id !== followed.publisherId) {
    return { kind: 'refused', version: remoteVersion }
  }

  const changelog = remote.changelog.filter((entry) => {
    try {
      return isNewer(entry.version, installedVersion) && !isNewer(entry.version, remoteVersion)
    } catch {
      return false
    }
  })

  return {
    kind: 'update',
    update: {
      changelog,
      isMajor: parseCourseVersion(remoteVersion).major > parseCourseVersion(installedVersion).major,
      recommended: changelog.some((entry) => entry.recommended === true),
      version: remoteVersion,
    },
  }
}

// How a pending update is shown, given "Finish on this version".
export function describeUpdate(followed: FollowedCourse): CourseUpdateInfo | null {
  const update = followed.pendingUpdate
  if (!update) {
    return null
  }

  const kind = update.recommended ? 'recommended' : 'regular'
  const prominent =
    !followed.finishOnVersion ||
    (kind === 'recommended' && followed.dismissedUpdateVersion !== update.version)

  return {
    changelog: update.changelog,
    isMajor: update.isMajor,
    kind,
    version: update.version,
    visibility: prominent ? 'prominent' : 'quiet',
  }
}

export type CourseSharingState = {
  // The teacher's published courses, by course id. The code is the drive key; it
  // never changes for a course, so it's kept once known. `publicIndex` is the
  // course's number among the publisher's courses, given at its first Publish,
  // and `publicId` the public id derived from it (SLJ-55); the code follows
  // from them.
  published: Record<string, { code?: string; publicId?: string; publicIndex?: number }>
  followed: Record<string, FollowedCourse>
}

export type CourseSharingStore = {
  read(): CourseSharingState
  write(state: CourseSharingState): void
}

export type CourseSharingWorker = {
  checkUpdate(driveKey: string): Promise<RemoteCourseVersion>
  downloadUpdate(
    driveKey: string,
    targetPath: string,
    transferId?: string,
  ): Promise<{ changedFiles: { key: string; op: string }[] }>
  followCourse(driveKey: string): Promise<void>
  getPeers(target: { courseId: string } | { driveKey: string }): Promise<number | null>
  importCourse(code: string, transferId?: string): Promise<{ courseId: string; driveKey: string; publisherId: string }>
  publishCourse(courseId: string): Promise<string>
  stopSharing(target: { courseId: string } | { driveKey: string }): Promise<void>
}

export type CourseSharingDeps = {
  // Replaces an imported course with the version `download` writes into a
  // staging folder, after validating it (applyImportedCourseUpdate).
  // Returns `download`'s result, or null when the version was already kept on
  // this device and nothing was downloaded.
  applyUpdateFiles<T>(
    expected: { courseId: string; driveKey: string; publisherId: string; version: string },
    download: (stagingPath: string) => Promise<T>,
  ): Promise<T | null>
  hasConsent(): boolean
  // The imported course's kept versions, newest first, and the current one.
  listInstalledVersions(courseId: string): Promise<{ current: string | null; versions: string[] }>
  readInstalledVersion(courseId: string): Promise<string | null>
  switchInstalledVersion(courseId: string, version: string): Promise<void>
  listPublishedCourseIds(): Promise<string[]>
  now?: () => Date
  setTimer?: (callback: () => void, delayMs: number) => { cancel(): void }
  store: CourseSharingStore
  worker: CourseSharingWorker
}

// A transfer the user stopped (the worker's CANCELLED code), not a failure.
function isCancelled(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'CANCELLED'
}

const FIRST_RETRY_DELAY_MS = 30_000
const MAX_RETRY_DELAY_MS = 10 * 60_000

function defaultSetTimer(callback: () => void, delayMs: number) {
  const timer = setTimeout(callback, delayMs)
  return { cancel: () => clearTimeout(timer) }
}

export function createCourseSharing(deps: CourseSharingDeps) {
  const setTimer = deps.setTimer ?? defaultSetTimer
  const now = deps.now ?? (() => new Date())

  // Runtime only: what's happening this session.
  const statuses = new Map<string, CourseSharingStatus>()
  const inFlight = new Map<string, Promise<void>>()
  // A publish that arrived while a share was running: share again afterwards, so
  // the drive ends up holding the newest published version.
  const rerunRequested = new Set<string>()
  const retries = new Map<string, { attempt: number; timer: { cancel(): void } }>()
  // Set by stop() (a profile switch, SLJ-57): no more retries or reacting.
  let stopped = false

  function updateState(update: (state: CourseSharingState) => CourseSharingState) {
    deps.store.write(update(deps.store.read()))
  }

  function scheduleRetry(key: string, run: () => void) {
    if (stopped) return
    const attempt = (retries.get(key)?.attempt ?? 0) + 1
    const delay = Math.min(FIRST_RETRY_DELAY_MS * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS)
    retries.get(key)?.timer.cancel()
    retries.set(key, { attempt, timer: setTimer(run, delay) })
  }

  function clearRetry(key: string) {
    retries.get(key)?.timer.cancel()
    retries.delete(key)
  }

  async function runShare(courseId: string): Promise<void> {
    statuses.set(courseId, 'sharing')

    try {
      const code = await deps.worker.publishCourse(courseId)
      updateState((state) => ({
        ...state,
        published: { ...state.published, [courseId]: { ...state.published[courseId], code } },
      }))
      statuses.set(courseId, 'shared')
      clearRetry(courseId)
    } catch (error) {
      console.error(`[course-sharing] sharing ${courseId} failed:`, error)
      statuses.set(courseId, 'waiting')
      scheduleRetry(courseId, () => void shareCourse(courseId))
    }
  }

  // Shares the course's current published version. Resolves once this attempt
  // has finished (successfully or not); never rejects.
  function shareCourse(courseId: string): Promise<void> {
    if (!deps.hasConsent()) {
      return Promise.resolve()
    }

    const running = inFlight.get(courseId)
    if (running) {
      rerunRequested.add(courseId)
      return running
    }

    const run = (async () => {
      do {
        rerunRequested.delete(courseId)
        await runShare(courseId)
      } while (rerunRequested.has(courseId))
    })().finally(() => inFlight.delete(courseId))

    inFlight.set(courseId, run)
    return run
  }

  async function shareAllPublished(): Promise<void> {
    if (!deps.hasConsent()) {
      return
    }

    for (const courseId of await deps.listPublishedCourseIds()) {
      await shareCourse(courseId)
    }
  }

  async function followOne(courseId: string, driveKey: string): Promise<void> {
    try {
      await deps.worker.followCourse(driveKey)
      statuses.set(courseId, 'shared')
      clearRetry(courseId)
    } catch (error) {
      console.error(`[course-sharing] following ${courseId} failed:`, error)
      statuses.set(courseId, 'waiting')
      scheduleRetry(courseId, () => void followOne(courseId, driveKey))
    }
  }

  async function followAll(): Promise<void> {
    const { followed } = deps.store.read()

    for (const [courseId, course] of Object.entries(followed)) {
      await followOne(courseId, course.driveKey)
    }
  }

  function updateFollowed(courseId: string, change: Partial<FollowedCourse>) {
    updateState((state) => {
      const followed = state.followed[courseId]
      return followed
        ? { ...state, followed: { ...state.followed, [courseId]: { ...followed, ...change } } }
        : state
    })
  }

  const checking = new Map<string, Promise<void>>()
  // A check requested while one was running: run once more afterwards. The
  // running one may have started before a peer with the new version connected
  // (e.g. right after startup), so the "drive changed" event that arrives
  // meanwhile must not be folded into its stale answer.
  const recheckRequested = new Set<string>()

  // Asks the drive which version it holds and records a pending (or refused)
  // update. Never throws: offline, it just tries again on the next event.
  function checkForUpdate(courseId: string): Promise<void> {
    const running = checking.get(courseId)
    if (running) {
      recheckRequested.add(courseId)
      return running
    }

    const run = (async () => {
      do {
        recheckRequested.delete(courseId)
        await checkOnce(courseId)
      } while (recheckRequested.has(courseId))
    })().finally(() => checking.delete(courseId))

    checking.set(courseId, run)
    return run
  }

  async function checkOnce(courseId: string): Promise<void> {
    const followed = deps.store.read().followed[courseId]
    const installedVersion = await deps.readInstalledVersion(courseId)

    if (!followed || !installedVersion) {
      return
    }

    try {
      const remote = await deps.worker.checkUpdate(followed.driveKey)
      const verdict = evaluateRemoteVersion(courseId, followed, remote, installedVersion)

      if (verdict.kind === 'update') {
        updateFollowed(courseId, { pendingUpdate: verdict.update, refusedUpdate: null })
      } else if (verdict.kind === 'refused') {
        console.warn(`[course-sharing] refused update ${verdict.version} of ${courseId}: different source`)
        updateFollowed(courseId, { refusedUpdate: { version: verdict.version } })
      } else {
        updateFollowed(courseId, { pendingUpdate: null })
      }
    } catch (error) {
      console.error(`[course-sharing] checking ${courseId} for an update failed:`, error)
    }
  }

  return {
    // At app start: reshare published courses (if consented), follow imported
    // ones and look for updates to them.
    async start(): Promise<void> {
      await Promise.all([
        shareAllPublished(),
        followAll().then(() =>
          Promise.all(Object.keys(deps.store.read().followed).map((courseId) => checkForUpdate(courseId))),
        ),
      ])
    },

    // Another profile is being opened (SLJ-57): cancel every pending retry
    // and ignore drive events from now on. Calls already waiting on the worker
    // fail as it stops (main also refuses them for a closed profile).
    stop(): void {
      stopped = true
      for (const key of [...retries.keys()]) clearRetry(key)
    },

    // The worker saw a followed drive change (or may have).
    onDriveChanged(driveKey: string): void {
      if (stopped) return
      const entry = Object.entries(deps.store.read().followed).find(
        ([, followed]) => followed.driveKey === driveKey,
      )
      if (entry) {
        void checkForUpdate(entry[0])
      }
    },

    checkForUpdate,

    // Applies the pending update, if it's still valid (checked again first, so
    // the version applied is the one the drive holds now).
    // `transferId` lets the UI poll progress and cancel; a cancelled download
    // returns `{ cancelled: true }` and leaves the course as it was.
    async applyUpdate(
      courseId: string,
      transferId?: string,
    ): Promise<({ version: string } & { changedFiles: string[] }) | Cancelled> {
      await checkForUpdate(courseId)
      const followed = deps.store.read().followed[courseId]
      const update = followed?.pendingUpdate

      if (!followed || !update) {
        throw new Error('There is no update for this course')
      }

      let downloaded: Awaited<ReturnType<CourseSharingWorker['downloadUpdate']>> | null
      try {
        downloaded = await deps.applyUpdateFiles(
          {
            courseId,
            driveKey: followed.driveKey,
            publisherId: followed.publisherId,
            version: update.version,
          },
          (stagingPath) => deps.worker.downloadUpdate(followed.driveKey, stagingPath, transferId),
        )
      } catch (error) {
        if (isCancelled(error)) return { cancelled: true }
        throw error
      }

      updateFollowed(courseId, {
        dismissedUpdateVersion: null,
        finishOnVersion: false,
        pendingUpdate: null,
      })
      return { changedFiles: downloaded?.changedFiles.map((file) => file.key) ?? [], version: update.version }
    },

    // Switches an imported course to another kept version (no download). Going
    // back counts as "Finish on this version" for the version left behind, so
    // the student isn't asked right away to update to what they just left;
    // switching to the newest clears it.
    async switchVersion(courseId: string, version: string): Promise<void> {
      await deps.switchInstalledVersion(courseId, version)
      await checkForUpdate(courseId)

      const pending = deps.store.read().followed[courseId]?.pendingUpdate
      updateFollowed(
        courseId,
        pending
          ? { dismissedUpdateVersion: pending.version, finishOnVersion: true }
          : { dismissedUpdateVersion: null, finishOnVersion: false },
      )
    },

    // How many peers this device is connected to for the course, while it's
    // shared from here (your own once published, an imported one while
    // followed); null otherwise, or if the worker can't say.
    async getPeers(courseId: string): Promise<number | null> {
      const state = deps.store.read()
      const followed = state.followed[courseId]
      const target = state.published[courseId]
        ? { courseId }
        : followed
          ? { driveKey: followed.driveKey }
          : null

      if (!target || statuses.get(courseId) !== 'shared') {
        return null
      }

      return deps.worker.getPeers(target).catch(() => null)
    },

    async getVersions(courseId: string): Promise<CourseSharingInfo['versions']> {
      if (!deps.store.read().followed[courseId]) {
        return null
      }
      const { current, versions } = await deps.listInstalledVersions(courseId)
      return { current, kept: versions }
    },

    // "Finish on this version": stop showing regular updates prominently.
    finishOnVersion(courseId: string): void {
      const update = deps.store.read().followed[courseId]?.pendingUpdate
      updateFollowed(courseId, { dismissedUpdateVersion: update?.version ?? null, finishOnVersion: true })
    },

    // Courses with an update to show on Home.
    listUpdates(): Record<string, CourseUpdateInfo> {
      const updates: Record<string, CourseUpdateInfo> = {}
      for (const [courseId, followed] of Object.entries(deps.store.read().followed)) {
        const update = describeUpdate(followed)
        if (update) updates[courseId] = update
      }
      return updates
    },

    // After a version is published: share it in the background.
    onPublished(courseId: string): void {
      void shareCourse(courseId)
    },

    // The teacher just gave the sharing consent: share everything already published.
    onConsentGiven(): void {
      void shareAllPublished()
    },

    // Imports a course by its code and records where it came from. The recorded
    // drive key is the code actually used, never re-read from the course's files.
    async importCourse(code: string, transferId?: string): Promise<{ courseId: string } | Cancelled> {
      let result: Awaited<ReturnType<CourseSharingWorker['importCourse']>>
      try {
        result = await deps.worker.importCourse(code, transferId)
      } catch (error) {
        if (isCancelled(error)) return { cancelled: true }
        throw error
      }
      updateState((state) => ({
        ...state,
        followed: {
          ...state.followed,
          [result.courseId]: {
            driveKey: result.driveKey,
            followedSince: now().toISOString(),
            publisherId: result.publisherId,
          },
        },
      }))
      statuses.set(result.courseId, 'shared')
      return { courseId: result.courseId }
    },

    getInfo(courseId: string): CourseSharingInfo {
      const state = deps.store.read()
      const followed = state.followed[courseId]
      // Your own course: the code it was published with. An imported public
      // course: the code it was imported with (its drive key), so the student
      // can share it with classmates. A gated one: none.
      const code = state.published[courseId]?.code ?? (followed && !followed.gated ? followed.driveKey : null)
      const isKnown = Boolean(code) || courseId in state.followed

      return {
        code,
        importedAt: followed?.followedSince ?? null,
        // Asked of the worker separately (getPeers).
        peers: null,
        refusedUpdate: followed?.refusedUpdate ?? null,
        status: statuses.get(courseId) ?? (isKnown ? 'waiting' : 'not-shared'),
        update: followed ? describeUpdate(followed) : null,
        versions: null,
      }
    },

    // The course was removed from this device: stop announcing it and forget it.
    async forgetCourse(courseId: string): Promise<void> {
      clearRetry(courseId)
      statuses.delete(courseId)
      const state = deps.store.read()
      const followed = state.followed[courseId]

      if (followed) {
        await deps.worker.stopSharing({ driveKey: followed.driveKey }).catch(() => {})
      }

      if (state.published[courseId]) {
        await deps.worker.stopSharing({ courseId }).catch(() => {})
      }

      const { [courseId]: _published, ...published } = state.published
      const { [courseId]: _followed, ...followedRest } = state.followed
      deps.store.write({ followed: followedRest, published })
    },
  }
}

export type CourseSharing = ReturnType<typeof createCourseSharing>
