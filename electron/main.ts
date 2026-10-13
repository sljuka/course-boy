import { app, BrowserWindow, dialog, ipcMain, net, protocol, screen, session, shell } from 'electron'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { copyFile, link, mkdir, open as openFile, readdir, readFile, rename, rm, stat as statFile } from 'node:fs/promises'
import path from 'node:path'
import Store from 'electron-store'
import {
  cancelTransfer,
  checkUpdate,
  downloadUpdate,
  findCourse,
  findProgram,
  followCourse,
  getPeers,
  getTransfer,
  importCourse,
  onDriveChanged,
  onMaintainerJoined,
  openIdentity,
  peekCourse,
  publishCourse,
  publishProgram,
  readIdentityBackup,
  sealIdentity,
  seedCourse,
  seedProgram,
  setIdentity,
  sharedCourseOp,
  spawnBareWorker,
  stopBareWorker,
  stopSharing,
} from './bare-worker'
import { createCourseProgress } from './course-progress'
import {
  applyProgramUpdate,
  createProgram,
  listPrograms,
  readImportedProgramPublisherName,
  landRestoredProgram,
  prepareProgramForPublish,
  programOnDevice,
  readProgram,
  removeProgram,
  resolveProgramAsset,
  updateProgram,
  uploadProgramImage,
} from './program-paths'
import { createProgramSharing, type ProgramSharingState } from './program-sharing'
import { isProgramManifest, localizeProgram, programCourseFromManifest, type PeekCourseResult, type ProgramManifest } from '../src/lib/program-package'
import { createCourseSharing, type CourseSharing, type CourseSharingState } from './course-sharing'
import { createChannels, describeForStudent, type ChannelsService } from './channels'
import { createBackground, isBackgroundSupported, isStartingHidden, setOpenAtLogin } from './background'
import { backgroundText } from './main-texts'
import type { ChannelForCourse } from '../src/lib/channels'
import { normalizePublisherName } from '../src/lib/publishers'
import type { CourseProgressState, RecordTestResultInput } from '../src/lib/course-progress'
import { createIdentityRestoreService, type IdentityRestoreState } from './identity-restore'
import { createMaintainers, type MaintainersState } from './maintainers'
import { createPublisherIdentity, IDENTITY_FILE_NAME } from './publisher-identity'
import { createProfile, listProfiles, removeProfile, updateProfile } from './profiles'
import { getActiveProfile, getBaseDataDir, getProfileDataDir, initProfiles, setActiveProfile } from './profile-context'
import { lockDownSession, lockDownWindow } from './window-security'
import { getCourseDetails, getCourseDiskUsage, getCourseVersionHistory, listCourses, resolvePackageDirectoryCandidates } from './course-registry'
import {
  applyCourseSvgPreset,
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  createLocalCourseSectionTest,
  cutLocalCourseVersion,
  getUnusedDraftAssets,
  deleteLocalCourseLesson,
  deleteLocalCourseSection,
  deleteLocalCourseSectionTest,
  ensureLocalCoursesRoot,
  getLocalCourseLessonTestDraft,
  getLocalCourseSectionTestDraft,
  applyImportedCourseUpdate,
  clampPreviousVersionsToKeep,
  cleanUpInterruptedCourseUpdates,
  createRecoveryStagingPath,
  getPublishedCoursePackagePath,
  landRecoveredCourse,
  listImportedCourseVersions,
  listPublishedLocalCourseIds,
  migrateImportedCourse,
  readBundledCourseSources,
  readImportedCourseChannelCode,
  readImportedCoursePublishers,
  readImportedCourseVersion,
  switchImportedCourseVersion,
  openCourseDirectoryInFileSystem,
  publishLocalCourseVersion,
  removeLocalCourse,
  revertLocalCourseDraftToVersion,
  previewLocalCourseDraftChanges,
  updateLocalCourseDraftMetadata,
  updateLocalCourseLessonContent,
  updateLocalCourseSectionIntro,
  removeLocalCourseSectionIntro,
  updateLocalCourseLessonTest,
  updateLocalCourseLessonMetadata,
  updateLocalCourseSection,
  updateLocalCourseSectionTest,
  updateLocalCourseSectionTestMetadata,
  uploadCourseAssetFromBytes,
  uploadLocalCourseAsset,
} from './course-paths'
import { assetMimeTypesByExtension, resolveAssetFilename } from '../src/lib/course-asset-id'
import { createCourseId, isValidCourseId } from '../src/lib/course-id'
import { DEFAULT_HOME_VIEW, parseCourseListView, type CourseListView } from '../src/lib/course-list-view'
import { parseExplorerPanelPreference, type ExplorerPanelPreference } from '../src/lib/explorer-panel'
import { parseRecentlyViewedEntries, type RecentlyViewedEntry } from '../src/lib/recently-viewed'
import type {
  CourseDiskUsage,
  ApplyCourseSvgPresetInput,
  CreateCourseDraftInput,
  CreateCourseLessonInput,
  CreateCourseSectionInput,
  CreateCourseSectionTestInput,
  CutCourseVersionInput,
  DeleteCourseLessonInput,
  DeleteCourseSectionInput,
  DeleteCourseSectionTestInput,
  GetLessonTestDraftInput,
  GetSectionTestDraftInput,
  PublishCourseVersionInput,
  RevertCourseDraftInput,
  SaveLessonTestInput,
  SaveSectionTestInput,
  UpdateCourseDraftMetadataInput,
  UpdateCourseLessonMetadataInput,
  UpdateCourseSectionInput,
  UpdateCourseSectionTestMetadataInput,
  UpdateLessonContentInput,
  UpdateSectionIntroInput,
  RemoveSectionIntroInput,
  UploadCourseAssetBytesInput,
  UploadCourseAssetInput,
} from '../src/lib/course-package'
import type {
  ChooseIdentityFileResult,
  IdentityRestoreStatus,
  IdentityStatus,
  RestoreIdentityResult,
  SetUpIdentityResult,
  UnlockIdentityResult,
} from '../src/lib/publisher-identity'
import type { ProfileRemovalSummary, ProfilesState, RemoveProfileResult } from '../src/lib/profiles'
import { isLocale, type Locale } from '../src/lib/i18n'
import { createPublishers, isPublisherId, type KnownPublisher, type PublishersState } from './publishers'
import type {
  ApplyCourseUpdateResult,
  CourseSharingInfo,
  CourseUpdateInfo,
  ImportCourseInput,
  ImportCourseResult,
  RunningImport,
} from '../src/lib/sharing'

// First: choose the profile and move Chromium's own data into the data
// folder's browser/ (SLJ-57, profile-context.ts), before anything reads paths.
initProfiles(process.argv)

// Two windows against the same userData directory raced their own
// autosave writes with no conflict detection (see "Previewing a draft
// test" / draft persistence notes in docs/persistence-notes.md) — each one
// periodically PUTs its own full in-memory snapshot of a course's draft,
// diffed only against what it last saved itself, so a stale second window
// silently overwrote a teacher's freshly-added exercises. Refusing a
// second instance closes that off at the source. The lock is scoped to
// Chromium's data folder (browser/ in the data folder, see initProfiles), so
// one app runs per data folder, whichever profile is open in it; separate
// `--user-data-dir` folders (the run-desktop driver, a teacher and a student
// side by side) still each get their own.
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Also when it was running in the background (SLJ-129).
    background.show()
  })
}

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      corsEnabled: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
    scheme: 'matko-asset',
  },
])

type Category = 'pre-school' | 'elementary-school' | 'high-school' | 'other'
type UserRole = 'student' | 'teacher'
type Persona = 'course-boy' | 'course-girl' | 'course-bot' | 'course-monster'
type Theme = 'light' | 'dark'
type UserPreferences = {
  category?: Category
  explorerPanel?: ExplorerPanelPreference
  homeView?: CourseListView
  myCoursesView?: CourseListView
  programView?: CourseListView
  versionsPanel?: ExplorerPanelPreference
  courseInfoPanel?: ExplorerPanelPreference
  showBundledCourses?: boolean
  useProgramThemes?: boolean
  showMnemonics?: boolean
  // SLJ-129: keep sharing when the window is closed (unset: not asked yet),
  // and start at login (in the menu bar, no window).
  keepSharingInBackground?: boolean
  openAtLogin?: boolean
  locale?: Locale
  nickname?: string
  persona?: Persona
  previousVersionsToKeep?: number
  // The name the teacher's courses and programs carry (SLJ-115 follow-up); unset or
  // "" to publish without one.
  publisherName?: string
  recentlyViewed?: RecentlyViewedEntry[]
  role?: UserRole
  theme?: Theme
}

// Everything the app keeps per person (SLJ-57): the stores in the open
// profile's folder and the services built on them. Opened for the profile at
// start, closed and opened again for the next one on every switch.
function openProfileServices(dataDir: string) {
  let closed = false
  const whileOpen = <Args extends unknown[], Result>(call: (...args: Args) => Promise<Result>) =>
    (...args: Args): Promise<Result> =>
      closed ? Promise.reject(new Error('This profile is no longer open')) : call(...args)

  const preferencesStore = new Store<UserPreferences>({ cwd: dataDir })

  // The publisher identity (SLJ-55): one password, one file. The identity file
  // in the profile's folder is the identity locked with the teacher's password,
  // and it is the backup too; unlocked, the identity is handed to the worker in
  // memory only.
  const identityFilePath = path.join(dataDir, IDENTITY_FILE_NAME)
  const publisherIdentity = createPublisherIdentity({
    file: {
      read: () => {
        try {
          return readFileSync(identityFilePath, 'utf8')
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
          throw error
        }
      },
      write: (text) => {
        const tempPath = `${identityFilePath}.tmp-${process.pid}`
        writeFileSync(tempPath, text, { mode: 0o600 })
        renameSync(tempPath, identityFilePath)
      },
    },
    randomKey: () => randomBytes(32),
    worker: {
      openIdentity: whileOpen(openIdentity),
      sealIdentity: whileOpen(sealIdentity),
      setIdentity: whileOpen(setIdentity),
    },
  })

  // Where shared courses stand: the teacher's published courses (with their code and
  // public number) and the student's imported courses (where each came from).
  // Main-process only: the renderer can read a course's status but never write where
  // a course comes from. `nextPublicIndex` is the number the next course published
  // with this identity gets; it only grows, so a removed course's number (and code)
  // is never given to another course.
  // The student's progress through their courses (SLJ-50): only
  // course-progress.ts reads or writes it.
  const courseProgressStore = new Store<CourseProgressState>({
    cwd: dataDir,
    defaults: { courses: {} },
    name: 'course-progress',
  })
  const courseProgress = createCourseProgress({
    store: {
      read: () => courseProgressStore.store,
      write: (state) => {
        courseProgressStore.store = state
      },
    },
  })

  // The channel (SLJ-31), created after the services it builds on; read
  // lazily by the ones that need its name or code.
  let channels: ChannelsService | null = null
  // The name this teacher's courses carry: their channel's, else (no channel
  // yet) the Publisher name they gave at the identity setup.
  const ownPublisherName = async () => {
    const channelId = programSharingStore.get('ownChannelId')
    const channel = channelId ? await readProgram(channelId).catch(() => null) : null
    const title = channel ? localizeProgram(channel, channel.defaultLocale).title : ''
    return normalizePublisherName(title) || normalizePublisherName(preferencesStore.get('publisherName'))
  }

  // Programs online (SLJ-32): yours published, imported ones followed.
  const programSharingStore = new Store<ProgramSharingState>({
    cwd: dataDir,
    defaults: { followed: {}, published: {} },
    name: 'program-sharing',
  })
  const programSharing = createProgramSharing({
    applyUpdate: (programId, driveKey) =>
      applyProgramUpdate(programId, (stagingPath) => whileOpen(downloadUpdate)(driveKey, stagingPath)),
    prepareForPublish: async (programId) =>
      prepareProgramForPublish(programId, (courseId) => courseSharing.getInfo(courseId).code, {
        isOwn: (courseId) => Boolean(courseSharingStore.get('published')[courseId]),
        publisherId: publisherIdentity.publisherId(),
        publisherName: await ownPublisherName(),
      }),
    store: {
      read: () => programSharingStore.store,
      write: (state) => {
        programSharingStore.store = state
      },
    },
    worker: {
      followCourse: whileOpen(followCourse),
      getPeers: whileOpen(getPeers),
      publishProgram: whileOpen(async (programId: string, programPath: string, publicIndex: number) =>
        publishProgram(programId, programPath, publicIndex, await ownPublisherName()),
      ),
      seedProgram: whileOpen(seedProgram),
      stopSharing: whileOpen(stopSharing),
    },
  })

  // `imports` (SLJ-128): imports running or waiting for someone who has the
  // code online, picked up again at every start until they land.
  const courseSharingStore = new Store<CourseSharingState & { imports?: RunningImport[]; nextPublicIndex?: number }>({
    cwd: dataDir,
    defaults: { followed: {}, published: {} },
    name: 'course-sharing',
  })

  // A published course's number among this publisher's courses (SLJ-55), given
  // at its first Publish and kept, so its public id and code never change.
  function publicIndexFor(courseId: string): number {
    const known = courseSharingStore.get('published')[courseId]?.publicIndex
    if (typeof known === 'number') return known

    const index = courseSharingStore.get('nextPublicIndex') ?? 0
    courseSharingStore.set('nextPublicIndex', index + 1)
    courseSharingStore.set('published', {
      ...courseSharingStore.get('published'),
      [courseId]: { ...courseSharingStore.get('published')[courseId], publicIndex: index },
    })
    return index
  }

  // Courses maintained by several publishers (SLJ-11): who maintains what,
  // proposals and approvals. Main-process only.
  // "Preview as student" (SLJ-67): proposed versions' files, each in
  // previews/<hash>/<course id>/, read through a throwaway course id (see
  // `previews` and courses:get). Gone at every profile open.
  const previewsRoot = path.join(dataDir, 'previews')
  void rm(previewsRoot, { force: true, recursive: true }).catch(() => {})
  const previews = new Map<string, { backPath: string; courseId: string; root: string; version: string }>()

  const maintainersStore = new Store<MaintainersState>({
    cwd: dataDir,
    defaults: { courses: {} },
    name: 'maintainers',
  })
  const maintainers = createMaintainers({
    ownPublisherName,
    courseOnDevice: async (courseId) =>
      (await listCourses(await ensureLocalCoursesRoot())).some((candidate) => candidate.id === courseId),
    createPreviewPath: async (hash, basePath) => {
      const root = path.join(previewsRoot, hash)
      await rm(root, { force: true, recursive: true })
      const target = path.join(root, 'package')
      await mkdir(target, { recursive: true })
      if (basePath) await linkTree(basePath, target)
      return target
    },
    createStagingPath: createRecoveryStagingPath,
    landCourse: landRecoveredCourse,
    // Shared from the shared course from now on (see publishCourse below).
    onShared: (courseId) => courseSharing.onPublished(courseId),
    op: whileOpen(sharedCourseOp) as typeof sharedCourseOp,
    publishedCourse: async (courseId) => {
      const entry = courseSharingStore.get('published')[courseId]
      const versionPath = await getPublishedCoursePackagePath(courseId)
      const manifest = versionPath
        ? (JSON.parse(await readFile(path.join(versionPath, 'course.json'), 'utf8')) as {
            defaultLocale?: string
            locales?: Record<string, { title?: unknown }>
            version?: string
          })
        : null
      const title = manifest?.locales?.[manifest.defaultLocale ?? '']?.title
      return {
        code: entry?.code ?? null,
        publicId: entry?.publicId ?? null,
        title: typeof title === 'string' ? title : undefined,
        version: manifest?.version ?? null,
        versionPath,
      }
    },
    removeStaging: (stagingPath) => rm(stagingPath, { force: true, recursive: true }),
    seedOldCode: whileOpen(seedCourse),
    store: {
      read: () => maintainersStore.store,
      write: (state) => {
        maintainersStore.store = state
      },
    },
  })

  const courseSharing = createCourseSharing({
    applyUpdateFiles: (expected, download) =>
      applyImportedCourseUpdate(expected, download, {
        previousToKeep: clampPreviousVersionsToKeep(preferencesStore.get('previousVersionsToKeep')),
      }),
    // Publishing online starts with setting up the identity.
    hasConsent: () => publisherIdentity.exists(),
    listInstalledVersions: listImportedCourseVersions,
    listPublishedCourseIds: listPublishedLocalCourseIds,
    onShared: () => void channels?.sync(),
    readInstalledVersion: readImportedCourseVersion,
    switchInstalledVersion: switchImportedCourseVersion,
    store: {
      read: () => ({
        followed: courseSharingStore.get('followed'),
        published: courseSharingStore.get('published'),
      }),
      write: (state) => {
        courseSharingStore.set('followed', state.followed)
        courseSharingStore.set('published', state.published)
      },
    },
    // Refused once this profile is closed, so a late retry of the previous
    // profile never reaches the next profile's worker.
    worker: {
      checkUpdate: whileOpen(checkUpdate),
      downloadUpdate: whileOpen(downloadUpdate),
      followCourse: whileOpen(followCourse),
      getPeers: whileOpen(getPeers),
      importCourse: whileOpen(importCourse),
      // Locked (until the password is given), an already published course is
      // still shared by its code; a new version waits for the password.
      publishCourse: whileOpen(async (courseId: string) => {
        // A course shared by several maintainers (SLJ-11): Publish proposes
        // the version for approval; its code is the shared course's.
        if (maintainers.isShared(courseId)) {
          return maintainers.publishShared(courseId, { propose: !publisherIdentity.isLocked() })
        }
        const published = courseSharingStore.get('published')[courseId]
        if (publisherIdentity.isLocked()) {
          if (!published?.code) throw Object.assign(new Error('The publisher identity is locked'), { code: 'LOCKED' })
          await seedCourse(courseId, published.code)
          return published.code
        }
        const { driveKey, publicId } = await publishCourse(
          courseId,
          publicIndexFor(courseId),
          await ownPublisherName(),
          channels?.codeForCourse(courseId) ?? '',
        )
        courseSharingStore.set('published', {
          ...courseSharingStore.get('published'),
          [courseId]: { ...courseSharingStore.get('published')[courseId], publicId },
        })
        return driveKey
      }),
      stopSharing: whileOpen(stopSharing),
    },
  })

  // Restoring the publisher identity from a copy of its file (SLJ-54): the
  // courses found again with it. Main-process only.
  const identityRestoreStore = new Store<IdentityRestoreState>({ cwd: dataDir, name: 'identity-restore' })

  const identityRestore = createIdentityRestoreService({
    chooseFile: async () => {
      const window = BrowserWindow.getFocusedWindow()
      const options = {
        filters: [{ extensions: ['matko-identity'], name: 'Matko identity file' }],
        properties: ['openFile' as const],
      }
      // Read at call time (not destructured), so e2e tests can stub it.
      const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
      return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
    },
    courseOnDevice: async (courseId) => {
      const course = (await listCourses(await ensureLocalCoursesRoot())).find((candidate) => candidate.id === courseId)
      return course ? { title: course.title } : null
    },
    createStagingPath: createRecoveryStagingPath,
    currentPublisherId: () => publisherIdentity.publisherId(),
    // Courses online with this profile's own identity: the code is recorded
    // once shared, and a published course is shared as soon as there's one.
    hasPublishedCourses: async () =>
      Object.keys(courseSharingStore.get('published')).length > 0 ||
      programSharing.hasPublished() ||
      (publisherIdentity.exists() && (await listPublishedLocalCourseIds()).length > 0),
    installIdentity: (text, key) => publisherIdentity.install(text, key),
    landCourse: landRecoveredCourse,
    // A course that moved to a shared one (SLJ-11): taken up again from the
    // shared course, and numbered like any found course.
    landSharedCourse: async ({ oldCode, publicId, publicIndex, sharedKey }) => {
      const landed = await maintainers.restoreSharedCourse({ oldCode, publicId, sharedKey })
      courseSharingStore.set('published', {
        ...courseSharingStore.get('published'),
        // The latest shared course's: its maintainers may have changed since (SLJ-70).
        [landed.courseId]: { code: landed.sharedKey, publicId, publicIndex },
      })
      courseSharingStore.set('nextPublicIndex', Math.max(courseSharingStore.get('nextPublicIndex') ?? 0, publicIndex + 1))
      return landed
    },
    // Test-only: a shorter wait per course number (e2e/sharing-restore.e2e.mjs). Unset in the app.
    lookupTimeoutMs: Number(process.env.MATKO_RESTORE_LOOKUP_MS) || undefined,
    // Test-only too: fewer misses before the search ends. Unset in the app.
    gapLimit: Number(process.env.MATKO_RESTORE_GAP_LIMIT) || undefined,
    onCourseFound: ({ courseId, driveKey, publicId, publicIndex }) => {
      courseSharingStore.set('published', {
        ...courseSharingStore.get('published'),
        [courseId]: { code: driveKey, publicId, publicIndex },
      })
      courseSharingStore.set('nextPublicIndex', Math.max(courseSharingStore.get('nextPublicIndex') ?? 0, publicIndex + 1))
      courseSharing.onPublished(courseId)
    },
    landProgram: landRestoredProgram,
    onProgramFound: (program) => programSharing.adoptRestored(program),
    programOnDevice,
    readFile: (filePath) => readFile(filePath, 'utf8'),
    removeStaging: (stagingPath) => rm(stagingPath, { force: true, recursive: true }),
    store: {
      read: () => identityRestoreStore.store,
      write: (state) => identityRestoreStore.set(state),
    },
    worker: {
      findCourse: whileOpen(findCourse),
      findProgram: whileOpen(findProgram),
      openIdentity: whileOpen(openIdentity),
      readIdentityBackup: whileOpen(readIdentityBackup),
    },
  })

  // Publishers (SLJ-108): the address book. It stores what the teacher added;
  // the publishers of imported courses and programs, and co-maintainers, are
  // read from what the app keeps already.
  const publishersStore = new Store<PublishersState>({ cwd: dataDir, defaults: {}, name: 'publishers' })
  const publishers = createPublishers({
    known: async (locale) => {
      const appLocale = isLocale(locale) ? locale : 'en'
      const courses = await listCourses(await ensureLocalCoursesRoot(), appLocale)
      const courseTitle = (courseId: string | null) => courses.find((course) => course.id === courseId)?.title ?? null
      const programs = await listPrograms(appLocale, () => [])
      const known: KnownPublisher[] = []
      // Channels followed here (SLJ-31), by code.
      const followedPrograms = Object.entries(programSharingStore.get('followed') ?? {})
      const channelHere = (code: string) =>
        followedPrograms.find(
          ([programId, entry]) => entry.driveKey === code && programs.some((program) => program.id === programId && program.kind === 'channel'),
        )?.[0] ?? null
      // Everyone who published an imported course: its publisher (with the
      // channel the course names), and the other maintainers of one
      // maintained together.
      for (const [courseId, followed] of Object.entries(courseSharingStore.get('followed') ?? {})) {
        const source = { id: courseId, kind: 'course' as const, title: courseTitle(courseId) ?? courseId }
        const publishers = await readImportedCoursePublishers(courseId).catch(() => [])
        const channelCode = await readImportedCourseChannelCode(courseId).catch(() => null)
        const channel = channelCode ? { code: channelCode, programId: channelHere(channelCode) } : null
        if (!publishers.some((publisher) => publisher.publisherId === followed.publisherId)) {
          known.push({ channel, publisherId: followed.publisherId, source })
        }
        for (const publisher of publishers) {
          known.push({
            channel: publisher.publisherId === followed.publisherId ? channel : null,
            name: publisher.name,
            publisherId: publisher.publisherId,
            source,
          })
        }
      }
      for (const [programId, followed] of followedPrograms) {
        const program = programs.find((candidate) => candidate.id === programId)
        known.push({
          channel: program?.kind === 'channel' ? { code: followed.driveKey, programId } : null,
          name: await readImportedProgramPublisherName(programId),
          publisherId: followed.publisherId,
          source: { id: programId, kind: 'program', title: program?.title ?? programId },
        })
      }
      for (const member of maintainers.knownPublishers()) {
        const title = courseTitle(member.courseId) ?? member.title ?? member.publicId
        known.push({ publisherId: member.publisherId, source: { id: member.publicId, kind: 'maintainer', title } })
      }
      return known
    },
    ownPublisherId: async () => publisherIdentity.publisherId() ?? '',
    store: { read: () => publishersStore.store, write: (state) => (publishersStore.store = state) },
  })

  channels = createChannels({
    canPublish: () => !publisherIdentity.isLocked(),
    channelCode: (programId) => programSharingStore.get('published')[programId]?.code ?? null,
    courseEntry: async (courseId, code) => {
      const coursesRoot = await ensureLocalCoursesRoot()
      const course = (await listCourses(coursesRoot)).find((candidate) => candidate.id === courseId)
      if (!course) return null
      const locales: ProgramManifest['courses'][number]['snapshot']['locales'] = {}
      for (const courseLocale of course.supportedLocales) {
        const inLocale = (await listCourses(coursesRoot, courseLocale)).find((candidate) => candidate.id === courseId)
        locales[courseLocale] = { description: inLocale?.description ?? '', title: inLocale?.title ?? course.title }
      }
      return {
        code,
        courseId,
        snapshot: {
          locales,
          publisherId: publisherIdentity.publisherId(),
          publisherName: (await ownPublisherName()) || null,
          supportedLocales: course.supportedLocales,
          version: course.publishedVersion,
        },
      }
    },
    createChannel: async (title) => {
      const locale = preferencesStore.get('locale')
      return (await createProgram({ kind: 'channel', locale: isLocale(locale) ? locale : 'en', title })).programId
    },
    // The name given at the identity setup (even none), else the nickname.
    initialName: () => {
      const given = preferencesStore.get('publisherName')
      return typeof given === 'string'
        ? normalizePublisherName(given)
        : normalizePublisherName(preferencesStore.get('nickname')) || normalizePublisherName(getActiveProfile()?.name)
    },
    publish: (programId) => programSharing.publish(programId),
    publishedCourses: () => courseSharing.publishedCourses(),
    readChannel: (programId) => readProgram(programId).catch(() => null),
    readOwnChannelId: () => programSharingStore.get('ownChannelId') ?? null,
    reshareCourses: (courseIds) => courseIds.forEach((courseId) => courseSharing.onPublished(courseId)),
    writeChannel: (manifest) => updateProgram(manifest, { fromChannels: true }),
    writeOwnChannelId: (programId) => programSharingStore.set('ownChannelId', programId),
  })

  return {
    channels,
    close() {
      closed = true
      courseSharing.stop()
      identityRestore.stop()
      maintainers.stop()
      publisherIdentity.close()
    },
    courseProgress,
    courseSharing,
    courseSharingStore,
    maintainers,
    previews,
    previewsRoot,
    programSharing,
    programSharingStore,
    identityFilePath,
    identityRestore,
    identityRestoreStore,
    preferencesStore,
    publisherIdentity,
    publishers,
  }
}

// A folder's files as hardlinks in `target` (copied where a link can't be
// made): a version's copy that costs no space. Writers replace files
// atomically, so the original is never changed through a link.
async function linkTree(source: string, target: string): Promise<void> {
  await mkdir(target, { recursive: true })
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) await linkTree(from, to)
    else if (entry.isFile()) await link(from, to).catch(() => copyFile(from, to))
  }
}

// The open profile's stores and services; replaced on every switch, so always
// read through `profile.` at call time.
let profile = openProfileServices(getProfileDataDir())

onDriveChanged((driveKey) => {
  profile.courseSharing.onDriveChanged(driveKey)
  profile.programSharing.onDriveChanged(driveKey)
  profile.maintainers.onDriveChanged(driveKey)
})

onMaintainerJoined((joined) => {
  void profile.maintainers.onJoined(joined).catch((error) => console.error('[maintainers] join failed:', error))
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

ipcMain.handle('preferences:get', () => {
  return profile.preferencesStore.store
})

ipcMain.handle(
  'preferences:set',
  async (_event, preferences: Partial<UserPreferences>) => {
    if (typeof preferences.locale === 'string') {
      profile.preferencesStore.set('locale', preferences.locale)
    }

    if (typeof preferences.nickname === 'string') {
      profile.preferencesStore.set('nickname', preferences.nickname)
      // The picker shows the profile by the name its owner goes by.
      const open = getActiveProfile()
      if (open) updateProfile(getBaseDataDir(), open.id, { name: preferences.nickname })
    }

    if (typeof preferences.category === 'string') {
      profile.preferencesStore.set('category', preferences.category)
    }

    if (typeof preferences.role === 'string') {
      profile.preferencesStore.set('role', preferences.role)
    }

    if (typeof preferences.persona === 'string') {
      profile.preferencesStore.set('persona', preferences.persona)
      const open = getActiveProfile()
      if (open) updateProfile(getBaseDataDir(), open.id, { persona: preferences.persona })
    }

    if (typeof preferences.theme === 'string') {
      profile.preferencesStore.set('theme', preferences.theme)
    }

    // Applied at the next update, not now: lowering it never deletes a version
    // the student might be about to go back to.
    if (typeof preferences.previousVersionsToKeep === 'number') {
      profile.preferencesStore.set('previousVersionsToKeep', clampPreviousVersionsToKeep(preferences.previousVersionsToKeep))
    }

    // Put online again so the courses carry the new name. Programs carry it
    // from their next Publish.
    if (typeof preferences.publisherName === 'string') {
      const name = normalizePublisherName(preferences.publisherName)
      if (name !== (profile.preferencesStore.get('publisherName') ?? '')) {
        profile.preferencesStore.set('publisherName', name)
        profile.courseSharing.onConsentGiven()
      }
    }

    // SLJ-129: the answer to "Keep sharing while Matko is closed?" (or the
    // Settings switch), and opening at login.
    if (typeof preferences.openAtLogin === 'boolean') {
      profile.preferencesStore.set('openAtLogin', preferences.openAtLogin)
      setOpenAtLogin(preferences.openAtLogin)
    }
    if (typeof preferences.keepSharingInBackground === 'boolean') {
      profile.preferencesStore.set('keepSharingInBackground', preferences.keepSharingInBackground)
      if (isAskingKeepSharing) {
        isAskingKeepSharing = false
        // After replying, so the window gets its answer before it hides or quits.
        setTimeout(() => background.answered(preferences.keepSharingInBackground === true), 0)
      } else {
        background.settingChanged(preferences.keepSharingInBackground)
      }
    }

    if (typeof preferences.showMnemonics === 'boolean') {
      profile.preferencesStore.set('showMnemonics', preferences.showMnemonics)
    }

    if (typeof preferences.useProgramThemes === 'boolean') {
      profile.preferencesStore.set('useProgramThemes', preferences.useProgramThemes)
    }
    if (typeof preferences.showBundledCourses === 'boolean') {
      profile.preferencesStore.set('showBundledCourses', preferences.showBundledCourses)
    }

    // Validated rather than trusted: it's a list the renderer builds, and only
    // well-formed entries (in-app paths, known kinds, capped length) persist.
    if (typeof preferences.explorerPanel === 'object' && preferences.explorerPanel !== null) {
      profile.preferencesStore.set('explorerPanel', parseExplorerPanelPreference(preferences.explorerPanel))
    }

    if (typeof preferences.homeView === 'string') {
      profile.preferencesStore.set('homeView', parseCourseListView(preferences.homeView, DEFAULT_HOME_VIEW))
    }

    if (typeof preferences.myCoursesView === 'string') {
      profile.preferencesStore.set('myCoursesView', parseCourseListView(preferences.myCoursesView))
    }

    if (typeof preferences.programView === 'string') {
      profile.preferencesStore.set('programView', parseCourseListView(preferences.programView))
    }

    if (typeof preferences.courseInfoPanel === 'object' && preferences.courseInfoPanel !== null) {
      profile.preferencesStore.set('courseInfoPanel', parseExplorerPanelPreference(preferences.courseInfoPanel))
    }

    if (typeof preferences.versionsPanel === 'object' && preferences.versionsPanel !== null) {
      profile.preferencesStore.set('versionsPanel', parseExplorerPanelPreference(preferences.versionsPanel))
    }

    if (Array.isArray(preferences.recentlyViewed)) {
      profile.preferencesStore.set('recentlyViewed', parseRecentlyViewedEntries(preferences.recentlyViewed))
    }

    return profile.preferencesStore.store
  },
)

// Profiles (SLJ-57). Creating, opening and switching happen in the running
// app (switchProfile): the window stays, its page reloads at Home in the
// chosen profile. The list is read from the folders.
ipcMain.handle('profiles:get-state', () => {
  const profiles = listProfiles(getBaseDataDir())
  const open = getActiveProfile()
  return {
    active: open ? (profiles.find((candidate) => candidate.id === open.id) ?? open) : null,
    profiles,
  } satisfies ProfilesState
})

ipcMain.handle('profiles:create', async (_event, input: { locale?: Locale; name: string }) => {
  const created = createProfile(getBaseDataDir(), { name: String(input?.name ?? '') })
  // The new profile starts with the name already given (onboarding goes on
  // from the persona) and the language chosen in the launcher.
  new Store<UserPreferences>({ cwd: path.join(getBaseDataDir(), 'profiles', created.id) }).set({
    ...(input?.locale === 'en' || input?.locale === 'sr' || input?.locale === 'sr-Cyrl' ? { locale: input.locale } : {}),
    nickname: created.name,
  })
  await switchProfile(created.id)
})

ipcMain.handle('profiles:open', async (_event, profileId: string) => {
  if (listProfiles(getBaseDataDir()).some((candidate) => candidate.id === profileId)) {
    await switchProfile(profileId)
  }
})

ipcMain.handle('profiles:switch', () => switchProfile(null))

// Removing the open profile (SLJ-61): what it would delete, for the dialog,
// then the removal itself. With a publishing identity it needs its password.
ipcMain.handle('profiles:get-removal-summary', async () => {
  const coursesRoot = await ensureLocalCoursesRoot()
  const made = (await listCourses(coursesRoot)).filter((course) => course.distribution === 'local')
  const published = new Set(await listPublishedLocalCourseIds())
  return {
    coursesMade: made.length,
    coursesNeverPublished: made.filter((course) => !published.has(course.id)).length,
    coursesPublished: Object.values(profile.courseSharingStore.get('published')).filter((entry) => entry.code).length,
    hasIdentity: profile.publisherIdentity.exists(),
    identityRestored: Boolean(profile.identityRestoreStore.get('publisherId')),
  } satisfies ProfileRemovalSummary
})

ipcMain.handle('profiles:open-courses-folder', async () => {
  await shell.openPath(await ensureLocalCoursesRoot())
})

ipcMain.handle('profiles:remove-current', (_event, password?: string) => removeCurrentProfile(password))

ipcMain.handle('preferences:reset-onboarding', () => {
  profile.preferencesStore.delete('nickname')
  profile.preferencesStore.delete('category')
  profile.preferencesStore.delete('role')
  profile.preferencesStore.delete('persona')
  profile.preferencesStore.delete('recentlyViewed')

  return profile.preferencesStore.store
})

ipcMain.handle('courses:preview-draft-changes', (_event, courseId: string) =>
  previewLocalCourseDraftChanges(courseId),
)

ipcMain.handle('courses:list', (_event, locale?: Locale) => {
  return ensureLocalCoursesRoot().then((coursesRoot) =>
    listCourses(coursesRoot, locale),
  )
})

ipcMain.handle(
  'courses:get',
  async (_event, courseId: string, locale?: Locale) => {
    // A proposed version's preview (SLJ-67): read from its own folder, under
    // its throwaway id, marked so the course page shows it as a preview.
    const preview = profile.previews.get(courseId)
    if (preview) {
      const details = await getCourseDetails(preview.root, preview.courseId, locale)
      return details ? { ...details, id: courseId, preview: { backPath: preview.backPath, version: preview.version } } : null
    }
    return getCourseDetails(await ensureLocalCoursesRoot(), courseId, locale)
  },
)

// The course page's Details: how much space the course takes.
ipcMain.handle('courses:get-disk-usage', async (_event, courseId: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }
  return getCourseDiskUsage(await ensureLocalCoursesRoot(), courseId) satisfies Promise<CourseDiskUsage | null>
})

ipcMain.handle('courses:create-draft', (_event, input: CreateCourseDraftInput) => {
  return createLocalCourseDraft(input)
})

ipcMain.handle('courses:create-section', (_event, input: CreateCourseSectionInput) => {
  return createLocalCourseSection(input)
})

ipcMain.handle('courses:update-section', (_event, input: UpdateCourseSectionInput) => {
  return updateLocalCourseSection(input)
})

// A document's title (and description) per language: the document editor's
// title fields, and so renaming a document.
ipcMain.handle('courses:update-lesson-metadata', (_event, input: UpdateCourseLessonMetadataInput) => {
  return updateLocalCourseLessonMetadata(input)
})

ipcMain.handle('courses:create-lesson', (_event, input: CreateCourseLessonInput) => {
  return createLocalCourseLesson(input)
})

ipcMain.handle('courses:update-lesson-content', (_event, input: UpdateLessonContentInput) => {
  return updateLocalCourseLessonContent(input)
})

ipcMain.handle('courses:update-section-intro', (_event, input: UpdateSectionIntroInput) => {
  return updateLocalCourseSectionIntro(input)
})

ipcMain.handle('courses:remove-section-intro', (_event, input: RemoveSectionIntroInput) => {
  return removeLocalCourseSectionIntro(input)
})

ipcMain.handle('courses:save-lesson-test', (_event, input: SaveLessonTestInput) => {
  return updateLocalCourseLessonTest(input)
})

ipcMain.handle('courses:get-lesson-test-draft', (_event, input: GetLessonTestDraftInput) => {
  return getLocalCourseLessonTestDraft(input)
})

ipcMain.handle('courses:create-section-test', (_event, input: CreateCourseSectionTestInput) => {
  return createLocalCourseSectionTest(input)
})

ipcMain.handle('courses:save-section-test', (_event, input: SaveSectionTestInput) => {
  return updateLocalCourseSectionTest(input)
})

ipcMain.handle('courses:get-section-test-draft', (_event, input: GetSectionTestDraftInput) => {
  return getLocalCourseSectionTestDraft(input)
})

ipcMain.handle(
  'courses:update-section-test-metadata',
  (_event, input: UpdateCourseSectionTestMetadataInput) => {
    return updateLocalCourseSectionTestMetadata(input)
  },
)

ipcMain.handle('courses:delete-section', (_event, input: DeleteCourseSectionInput) => {
  return deleteLocalCourseSection(input)
})

ipcMain.handle('courses:delete-lesson', (_event, input: DeleteCourseLessonInput) => {
  return deleteLocalCourseLesson(input)
})

ipcMain.handle('courses:delete-section-test', (_event, input: DeleteCourseSectionTestInput) => {
  return deleteLocalCourseSectionTest(input)
})

ipcMain.handle(
  'courses:update-draft-metadata',
  (_event, input: UpdateCourseDraftMetadataInput) => {
    return updateLocalCourseDraftMetadata(input)
  },
)

ipcMain.handle('courses:remove', async (_event, courseId: string) => {
  await removeLocalCourse(courseId)
  await profile.courseSharing.forgetCourse(courseId)
  profile.courseProgress.forgetCourse(courseId)
})

// ─── Programs (SLJ-32) ──────────────────────────────────────────────────────
// Phase 1: your own programs, on this device (electron/program-paths.ts).

ipcMain.handle('programs:list', (_event, locale: unknown) =>
  listPrograms(isLocale(locale) ? locale : 'en', (programId, courseIds) =>
    profile.programSharing.newCourseIds(programId, courseIds),
  ),
)

ipcMain.handle('programs:get', (_event, programId: unknown) => {
  if (typeof programId !== 'string') throw new Error('Invalid program id')
  return readProgram(programId)
})

ipcMain.handle('programs:create', (_event, input: { locale?: unknown; title?: unknown }) => {
  if (!isLocale(input?.locale) || typeof input.title !== 'string' || input.title.trim().length === 0) {
    throw new Error('Invalid program')
  }
  return createProgram({ locale: input.locale, title: input.title.trim() })
})

ipcMain.handle('programs:update', (_event, manifest: unknown) => {
  if (!isProgramManifest(manifest)) throw new Error('Program data is invalid')
  return updateProgram(manifest)
})

ipcMain.handle('programs:upload-image', (_event, programId: unknown) => {
  if (typeof programId !== 'string') throw new Error('Invalid program id')
  return uploadProgramImage(programId)
})

ipcMain.handle('programs:remove', async (_event, programId: unknown) => {
  if (typeof programId !== 'string') throw new Error('Invalid program id')
  await profile.programSharing.forget(programId)
  profile.courseProgress.forgetProgram(programId)
  return removeProgram(programId)
})

// Phase 2: Publish puts the program online (signed, so the identity must be
// unlocked: the renderer asks for it first), and returns its code.
ipcMain.handle('programs:publish', async (_event, programId: unknown) => {
  if (typeof programId !== 'string') throw new Error('Invalid program id')
  if (profile.publisherIdentity.isLocked()) {
    throw new Error('The publisher identity is locked: unlock it to publish')
  }
  await readProgram(programId)
  const result = await profile.programSharing.publish(programId)
  // Your channel (SLJ-31): your courses carry its name, so they go online
  // again with the new one.
  if (programId === profile.programSharingStore.get('ownChannelId')) profile.courseSharing.onConsentGiven()
  return result
})

ipcMain.handle('programs:get-sharing', async (_event, programId: unknown) => {
  if (typeof programId !== 'string') throw new Error('Invalid program id')
  const program = await readProgram(programId)
  return profile.programSharing.getInfo(
    programId,
    program.courses.map((course) => course.courseId),
  )
})

// The student opened an imported program's page: its courses aren't new any more.
ipcMain.handle('programs:mark-seen', async (_event, programId: unknown) => {
  if (typeof programId !== 'string') throw new Error('Invalid program id')
  const program = await readProgram(programId)
  profile.programSharing.markSeen(
    programId,
    program.courses.map((course) => course.courseId),
  )
})

// Someone else's course for a program, by its code: its titles and
// descriptions, without importing it, and how many people have it online
// right now (SLJ-127: whether a program's course can be downloaded).
ipcMain.handle('programs:peek-course', async (_event, code: unknown) => {
  if (typeof code !== 'string' || !/^[a-z0-9]{52,64}$/i.test(code.trim())) throw new Error('Invalid code')
  try {
    const { manifest, peers, publisherId, publisherName } = await peekCourse(code.trim())
    const course = programCourseFromManifest(code.trim(), manifest, publisherId, publisherName ?? null)
    if (!course) throw new Error('This code is not a course')
    return { course, peers: typeof peers === 'number' ? peers : 0 } satisfies PeekCourseResult
  } catch (error) {
    if ((error as { code?: string }).code === 'NOT_FOUND') return { notFound: true } satisfies PeekCourseResult
    throw error
  }
})

// ─── Progress (SLJ-50) ──────────────────────────────────────────────────────
// The student's own progress, per profile: see electron/course-progress.ts.

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 256
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

ipcMain.handle('progress:get', () => profile.courseProgress.read())

ipcMain.handle('progress:record-opened', (_event, courseId: unknown) => {
  if (!isId(courseId)) throw new Error('Invalid course id')
  if (profile.previews.has(courseId)) return
  profile.courseProgress.recordOpened(courseId)
})

ipcMain.handle('progress:record-step-done', (_event, input: { courseId?: unknown; stepId?: unknown }) => {
  if (!isId(input?.courseId) || !isId(input.stepId)) throw new Error('Invalid step')
  if (profile.previews.has(input.courseId)) return
  profile.courseProgress.recordStepDone(input.courseId, input.stepId)
})

ipcMain.handle('progress:record-test-result', (_event, input: RecordTestResultInput) => {
  const result = input?.result
  if (
    !isId(input?.courseId) ||
    !isId(input.stepId) ||
    !isCount(result?.correct) ||
    !isCount(result.total) ||
    !isCount(result.longestStreak) ||
    result.correct > result.total ||
    result.longestStreak > result.correct
  ) {
    throw new Error('Invalid test result')
  }
  // A preview's progress isn't kept (SLJ-67).
  if (profile.previews.has(input.courseId)) return
  profile.courseProgress.recordTestResult(input.courseId, input.stepId, {
    correct: result.correct,
    longestStreak: result.longestStreak,
    total: result.total,
  })
})

ipcMain.handle('progress:set-favorite', (_event, input: { courseId?: unknown; favorite?: unknown }) => {
  if (!isId(input?.courseId) || typeof input.favorite !== 'boolean') throw new Error('Invalid favorite')
  if (profile.previews.has(input.courseId)) return
  profile.courseProgress.setFavorite(input.courseId, input.favorite)
})

// Courses maintained by several publishers (SLJ-11). Signing needs the
// publishing identity unlocked; the worker refuses otherwise (LOCKED).
const isPublicId = (value: unknown): value is string => typeof value === 'string' && /^[a-z2-7]{16}$/.test(value)
const isHash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)

ipcMain.handle('maintainers:invite', (_event, input: { courseId?: unknown; publisherId?: unknown }) => {
  if (!isId(input?.courseId) || typeof input.publisherId !== 'string' || !/^[a-z0-9]{52,64}$/i.test(input.publisherId.trim())) {
    throw new Error('Invalid invite')
  }
  return profile.maintainers.invite(input.courseId, input.publisherId.trim())
})

ipcMain.handle('maintainers:accept', (_event, code: unknown) => {
  if (typeof code !== 'string' || code.length > 1024) throw new Error('Invalid invite code')
  return profile.maintainers.accept(code)
})

ipcMain.handle('maintainers:start-sharing', async (_event, input: { courseId?: unknown; quorum?: unknown }) => {
  if (!isId(input?.courseId) || typeof input.quorum !== 'number') throw new Error('Invalid request')
  await profile.maintainers.startSharing(input.courseId, input.quorum)
})

// SLJ-70: changes who maintains a shared course, or the rule (another move).
ipcMain.handle(
  'maintainers:propose-change',
  async (_event, input: { courseId?: unknown; publisherIds?: unknown; quorum?: unknown }) => {
    const ids = input?.publisherIds
    if (
      !isId(input?.courseId) ||
      typeof input.quorum !== 'number' ||
      !Array.isArray(ids) ||
      ids.length > 50 ||
      !ids.every((id) => typeof id === 'string' && /^[a-z0-9]{52,64}$/i.test(id))
    ) {
      throw new Error('Invalid request')
    }
    await profile.maintainers.proposeChange(input.courseId, { publisherIds: ids as string[], quorum: input.quorum })
  },
)

ipcMain.handle('maintainers:get', (_event, courseId: unknown) => {
  if (!isId(courseId)) throw new Error('Invalid course id')
  return profile.maintainers.getInfo(courseId)
})

ipcMain.handle('maintainers:list-approvals', () => profile.maintainers.listApprovals())

ipcMain.handle('maintainers:review', (_event, input: { hash?: unknown; publicId?: unknown }) => {
  if (!isPublicId(input?.publicId) || !isHash(input.hash)) throw new Error('Invalid proposal')
  return profile.maintainers.review(input.publicId, input.hash)
})

// "Preview as student" (SLJ-67): the proposed version's files land in their
// own folder, and get a throwaway course id the student pages read (courses:get
// and the asset protocol look it up). Returns that id.
ipcMain.handle('maintainers:preview', async (_event, input: { hash?: unknown; publicId?: unknown }) => {
  if (!isPublicId(input?.publicId) || !isHash(input.hash)) throw new Error('Invalid proposal')
  const { publicId, hash } = input
  const opened = profile
  const { courseId, path: stagingPath, version } = await opened.maintainers.preview(publicId, hash)
  const root = path.dirname(stagingPath)
  await rename(stagingPath, path.join(root, courseId))
  for (const [id, entry] of opened.previews) if (entry.root === root) opened.previews.delete(id)
  const previewId = createCourseId()
  opened.previews.set(previewId, { backPath: `/approvals/${publicId}/${hash}`, courseId, root, version })
  return { courseId: previewId }
})

// A proposal answered: its preview isn't needed any more.
function dropPreviews(hash: string) {
  const root = path.join(profile.previewsRoot, hash)
  for (const [id, entry] of profile.previews) if (entry.root === root) profile.previews.delete(id)
  void rm(root, { force: true, recursive: true }).catch(() => {})
}

ipcMain.handle('maintainers:approve', async (_event, input: { hash?: unknown; publicId?: unknown }) => {
  if (!isPublicId(input?.publicId) || !isHash(input.hash)) throw new Error('Invalid proposal')
  await profile.maintainers.approve(input.publicId, input.hash)
  dropPreviews(input.hash)
})

// SLJ-110: withdraws your own waiting version (only while nobody else approved it).
ipcMain.handle('maintainers:withdraw', async (_event, input: { hash?: unknown; publicId?: unknown }) => {
  if (!isPublicId(input?.publicId) || !isHash(input.hash)) throw new Error('Invalid proposal')
  await profile.maintainers.withdraw(input.publicId, input.hash)
})

ipcMain.handle('maintainers:request-changes', async (_event, input: { hash?: unknown; note?: unknown; publicId?: unknown }) => {
  if (!isPublicId(input?.publicId) || !isHash(input.hash) || typeof input.note !== 'string') {
    throw new Error('Invalid request')
  }
  await profile.maintainers.requestChanges(input.publicId, input.hash, input.note)
  dropPreviews(input.hash)
})

ipcMain.handle('progress:set-program-favorite', (_event, input: { favorite?: unknown; programId?: unknown }) => {
  if (!isId(input?.programId) || typeof input.favorite !== 'boolean') throw new Error('Invalid favorite')
  profile.courseProgress.setProgramFavorite(input.programId, input.favorite)
})

ipcMain.handle('courses:open-in-file-system', (_event, courseId: string) => {
  return openCourseDirectoryInFileSystem(courseId)
})

ipcMain.handle('courses:upload-asset', (_event, input: UploadCourseAssetInput) => {
  return uploadLocalCourseAsset(input)
})

ipcMain.handle('courses:upload-asset-bytes', (_event, input: UploadCourseAssetBytesInput) => {
  return uploadCourseAssetFromBytes(input)
})

ipcMain.handle('courses:apply-svg-preset', (_event, input: ApplyCourseSvgPresetInput) => {
  return applyCourseSvgPreset(input)
})

ipcMain.handle('courses:get-version-history', (_event, courseId: string) => {
  return ensureLocalCoursesRoot().then((coursesRoot) =>
    getCourseVersionHistory(coursesRoot, courseId),
  )
})

ipcMain.handle('courses:cut-version', (_event, input: CutCourseVersionInput) => {
  return cutLocalCourseVersion(input)
})

ipcMain.handle('courses:get-unused-draft-assets', (_event, courseId: string) => {
  return getUnusedDraftAssets(courseId)
})

ipcMain.handle('courses:revert-to-version', (_event, input: RevertCourseDraftInput) => {
  return revertLocalCourseDraftToVersion(input)
})

ipcMain.handle('courses:publish-version', async (_event, input: PublishCourseVersionInput) => {
  // Publishing puts a new version online, signed: with the identity locked by
  // its password, the renderer asks for it first (unlockIdentity).
  if (profile.publisherIdentity.isLocked()) {
    throw new Error('The publisher identity is locked: unlock it to publish')
  }
  // "Show on my channel" (SLJ-31): as chosen, else on at a course's first publish.
  const isFirstPublish = !profile.courseSharingStore.get('published')[input.courseId]
  await publishLocalCourseVersion(input)
  if (typeof input.showOnChannel === 'boolean' || isFirstPublish) {
    profile.courseSharing.setListedOnChannel(input.courseId, input.showOnChannel ?? true)
  }
  // Publish puts the version online; that runs in the background and can't make
  // Publish fail (see electron/course-sharing.ts). Once it's online, the
  // channel updates (courseSharing's onShared).
  profile.courseSharing.onPublished(input.courseId)
})

// Channels (SLJ-31): the profile's own (created the first time it's asked
// for), whether a course of ours is shown on it, and an imported course's.
ipcMain.handle('channels:own', () => profile.channels.own())

ipcMain.handle('channels:set-course-listed', async (_event, input: { courseId?: unknown; listed?: unknown }) => {
  if (typeof input?.courseId !== 'string' || !isValidCourseId(input.courseId) || typeof input.listed !== 'boolean') {
    throw new Error('Invalid input')
  }
  profile.courseSharing.setListedOnChannel(input.courseId, input.listed)
  await profile.channels.sync()
  // Online again, so its source.json names the channel (or no longer does).
  if (profile.courseSharing.getInfo(input.courseId).code) profile.courseSharing.onPublished(input.courseId)
})

ipcMain.handle('channels:get-for-course', async (_event, courseId: unknown): Promise<ChannelForCourse | null> => {
  if (typeof courseId !== 'string' || !isValidCourseId(courseId)) throw new Error('Invalid course id')
  const locale = profile.preferencesStore.get('locale')
  const titleOf = (manifest: ProgramManifest) => localizeProgram(manifest, isLocale(locale) ? locale : manifest.defaultLocale).title

  // Ours: our channel, and whether the course is shown on it.
  const published = profile.courseSharingStore.get('published')[courseId]
  if (published) {
    const programId = profile.programSharingStore.get('ownChannelId') ?? null
    const channel = programId ? await readProgram(programId).catch(() => null) : null
    const listed = published.onChannel === true
    return {
      code: programId ? (profile.programSharingStore.get('published')[programId]?.code ?? null) : null,
      listed,
      programId: channel ? programId : null,
      title: channel ? titleOf(channel) : null,
      verified: listed,
    }
  }

  // Imported: the channel its source.json names, checked once it's here.
  const code = await readImportedCourseChannelCode(courseId)
  const followed = Object.entries(profile.programSharingStore.get('followed')).find(([, entry]) => entry.driveKey === code)
  const manifest = followed ? await readProgram(followed[0]).catch(() => null) : null
  return describeForStudent(
    code,
    courseId,
    followed && manifest?.kind === 'channel' ? { manifest, programId: followed[0], title: titleOf(manifest) } : null,
  )
})

ipcMain.handle('sharing:get-creator-key', () => {
  return profile.publisherIdentity.publisherId() ?? ''
})

// Publishers (SLJ-108): the profile's address book of Publisher IDs.
ipcMain.handle('publishers:list', (_event, locale: unknown) => profile.publishers.list(typeof locale === 'string' ? locale : 'en'))

ipcMain.handle('publishers:save', (_event, input: { label?: unknown; publisherId?: unknown }) => {
  const publisherId = typeof input?.publisherId === 'string' ? input.publisherId.trim() : ''
  if (!isPublisherId(publisherId) || (input.label !== null && typeof input.label !== 'string')) {
    throw new Error('Invalid publisher')
  }
  return profile.publishers.save({ label: input.label, publisherId })
})

ipcMain.handle('publishers:remove', (_event, publisherId: unknown) => {
  if (!isPublisherId(publisherId)) throw new Error('Invalid publisher')
  return profile.publishers.remove(publisherId)
})

// The publisher identity (SLJ-55): set up with the wizard, unlocked with its
// password, its file shown for copying, or restored from a copy (SLJ-54).
ipcMain.handle('sharing:get-identity-status', () => {
  return profile.publisherIdentity.getStatus() satisfies IdentityStatus
})

ipcMain.handle('sharing:set-up-identity', async (_event, password: string) => {
  const result = await profile.publisherIdentity.setUp(String(password ?? ''))
  // Published courses waiting for an identity go online now.
  if ('ok' in result) profile.courseSharing.onConsentGiven()
  return result satisfies SetUpIdentityResult
})

ipcMain.handle('sharing:unlock-identity', (_event, password: string) => {
  return profile.publisherIdentity.unlock(String(password ?? '')) satisfies Promise<UnlockIdentityResult>
})

ipcMain.handle('sharing:open-without-publishing', () => {
  profile.publisherIdentity.openWithoutPublishing()
})

ipcMain.handle('sharing:reveal-identity-file', () => {
  if (profile.publisherIdentity.exists()) shell.showItemInFolder(profile.identityFilePath)
})

ipcMain.handle('sharing:choose-identity-file', () => {
  return profile.identityRestore.chooseFile() satisfies Promise<ChooseIdentityFileResult>
})

ipcMain.handle('sharing:restore-identity', (_event, password: string) => {
  return profile.identityRestore.restore(String(password ?? '')) satisfies Promise<RestoreIdentityResult>
})

ipcMain.handle('sharing:get-identity-restore-status', () => {
  return profile.identityRestore.getStatus() satisfies IdentityRestoreStatus
})

ipcMain.handle('sharing:search-restored-courses', () => {
  profile.identityRestore.searchAgain()
})

ipcMain.handle('sharing:get-course-sharing', async (_event, courseId: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  return {
    ...profile.courseSharing.getInfo(courseId),
    peers: await profile.courseSharing.getPeers(courseId),
    versions: await profile.courseSharing.getVersions(courseId),
  } satisfies CourseSharingInfo
})

ipcMain.handle('sharing:list-course-updates', () => {
  return profile.courseSharing.listUpdates() satisfies Record<string, CourseUpdateInfo>
})

ipcMain.handle('sharing:apply-course-update', async (_event, courseId: string, transferId?: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  const result = await profile.courseSharing.applyUpdate(courseId, typeof transferId === 'string' ? transferId : undefined)
  return ('cancelled' in result ? result : { version: result.version }) satisfies ApplyCourseUpdateResult
})

// An import or update download in progress, polled by the renderer (SLJ-43).
ipcMain.handle('sharing:get-transfer', (_event, transferId: string) => {
  return typeof transferId === 'string' ? getTransfer(transferId) : null
})

ipcMain.handle('sharing:cancel-transfer', (_event, transferId: string) => {
  return typeof transferId === 'string' ? cancelTransfer(transferId) : undefined
})

ipcMain.handle('sharing:switch-course-version', async (_event, courseId: string, version: string) => {
  if (!isValidCourseId(courseId) || typeof version !== 'string') {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  await profile.courseSharing.switchVersion(courseId, version)
})

ipcMain.handle('sharing:finish-on-version', (_event, courseId: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  profile.courseSharing.finishOnVersion(courseId)
})

// An import by code (a course's, or a program's or channel's). It can wait a
// long time for someone who has it to be online, so it's kept in the
// profile's store while it runs (SLJ-128): quitting doesn't drop it, the next
// start picks it up again (`resumeImports`). One per code at a time: a second
// import of the same code gets the running one.
type ProfileServices = ReturnType<typeof openProfileServices>
const runningImports = new WeakMap<ProfileServices, Map<string, Promise<ImportCourseResult>>>()

function startImport(opened: ProfileServices, code: string, transferId: string): Promise<ImportCourseResult> {
  const running = runningImports.get(opened) ?? new Map<string, Promise<ImportCourseResult>>()
  runningImports.set(opened, running)
  const existing = running.get(code)
  if (existing) return existing

  const store = opened.courseSharingStore
  if (!(store.get('imports') ?? []).some((entry) => entry.code === code)) {
    store.set('imports', [...(store.get('imports') ?? []), { code, startedAt: new Date().toISOString(), transferId }])
  }
  const forget = () => store.set('imports', (store.get('imports') ?? []).filter((entry) => entry.code !== code))

  const promise = (async (): Promise<ImportCourseResult> => {
    const result = await opened.courseSharing.importCourse(code, transferId)
    if ('cancelled' in result) return result
    // A program's code (SLJ-32): it landed under programs/, followed from now on.
    if ('programId' in result) {
      const program = await readProgram(result.programId)
      opened.programSharing.recordImport(
        result,
        program.courses.map((course) => course.courseId),
      )
      return { programId: result.programId }
    }
    // The worker lands an import root-only; move it into versions/<v>/ (SLJ-40).
    await migrateImportedCourse(result.courseId)
    return { courseId: result.courseId }
  })()
    .then(
      (result) => {
        forget()
        return result
      },
      (error) => {
        // A failure the worker reported (not a course, say) ends it; the
        // worker stopping (the app quitting, a profile switch) doesn't: it's
        // picked up again next time.
        if (profile === opened && (error as { fromWorker?: boolean }).fromWorker) forget()
        throw error
      },
    )
    .finally(() => running.delete(code))
  running.set(code, promise)
  return promise
}

// At start: the imports a previous session left running, in the background.
function resumeImports(opened: ProfileServices): void {
  for (const entry of opened.courseSharingStore.get('imports') ?? []) {
    void startImport(opened, entry.code, entry.transferId).catch((error) => {
      console.error(`[sharing] resumed import of ${entry.code} failed:`, error)
    })
  }
}

ipcMain.handle('sharing:import-course', async (_event, input: ImportCourseInput) => {
  if (typeof input?.code !== 'string' || input.code.trim().length === 0) throw new Error('Invalid code')
  const transferId = typeof input.transferId === 'string' ? input.transferId : randomUUID()
  return startImport(profile, input.code, transferId) satisfies Promise<ImportCourseResult>
})

// Imports running or waiting (SLJ-128), for Home's Downloading group: the
// ones a restart picked up again aren't in the window's own list.
ipcMain.handle('sharing:list-imports', (): RunningImport[] => profile.courseSharingStore.get('imports') ?? [])

// A program's logo or banner (SLJ-32): `matko-asset://program-<id>/<file>`.
// "program-" can't begin a course id (16 base32 characters), so the two never
// clash.
const PROGRAM_ASSET_HOST_PREFIX = 'program-'

async function handleProgramAssetRequest(requestUrl: URL): Promise<Response> {
  const asset = await resolveProgramAsset(
    requestUrl.hostname.slice(PROGRAM_ASSET_HOST_PREFIX.length),
    decodeURIComponent(requestUrl.pathname.replace(/^\//, '')),
  )
  if (!asset) return new Response(null, { status: 404 })

  const fileResponse = await net.fetch(pathToFileURL(asset.filePath).toString())
  const headers = new Headers(fileResponse.headers)
  headers.set('Content-Type', asset.mimeType)
  return new Response(fileResponse.body, { headers, status: fileResponse.status })
}

async function handleCourseAssetRequest(request: Request): Promise<Response> {
  try {
    const requestUrl = new URL(request.url)
    if (requestUrl.hostname.startsWith(PROGRAM_ASSET_HOST_PREFIX)) {
      return await handleProgramAssetRequest(requestUrl)
    }
    const courseId = requestUrl.hostname
    const filename = resolveAssetFilename(
      decodeURIComponent(requestUrl.pathname.replace(/^\//, '')),
    )

    if (!isValidCourseId(courseId) || !filename) {
      return new Response(null, { status: 404 })
    }

    // A preview's files are in its own folder, under its real course id (SLJ-67).
    const preview = profile.previews.get(courseId)
    const localCoursesRoot = preview ? preview.root : await ensureLocalCoursesRoot()
    const courseRootPath = path.resolve(localCoursesRoot, preview ? preview.courseId : courseId)
    const relativeToCoursesRoot = path.relative(localCoursesRoot, courseRootPath)

    if (relativeToCoursesRoot.startsWith('..') || path.isAbsolute(relativeToCoursesRoot)) {
      return new Response(null, { status: 404 })
    }

    for (const packageDirectoryPath of await resolvePackageDirectoryCandidates(courseRootPath)) {
      const assetsDirectoryPath = path.join(packageDirectoryPath, 'assets')
      const resolvedAssetPath = path.resolve(assetsDirectoryPath, filename)
      const relativeToAssetsDirectory = path.relative(assetsDirectoryPath, resolvedAssetPath)

      if (
        relativeToAssetsDirectory.startsWith('..') ||
        path.isAbsolute(relativeToAssetsDirectory)
      ) {
        continue
      }

      const mimeType =
        assetMimeTypesByExtension[path.extname(resolvedAssetPath).toLowerCase()]

      if (!mimeType) {
        continue
      }

      // Not in this candidate (e.g. an imported course has no draft/): try the
      // next one. Checked here, before the range branch, whose `statFile` would
      // otherwise throw and turn the whole request into a 404.
      const assetStat = await statFile(resolvedAssetPath).catch(() => null)

      if (!assetStat?.isFile()) {
        continue
      }

      // A `.mov` (or any container whose `moov` atom lands after `mdat`,
      // which is the common case for an unedited screen recording, not
      // just an edge case) needs its player to read an arbitrary byte
      // range to find that atom before it can play at all. `net.fetch`
      // does honor a `Range` header for a `file://` URL by quietly slicing
      // the body, but it answers with a plain `200` and no `Content-Range`
      // — Chromium's `<video>` element treats that as the server ignoring
      // the range request and fails outright with a MEDIA_ELEMENT_ERROR
      // "Format error" rather than falling back to the full body. So a
      // real `Range` request is served by hand here, with the `206` status
      // and headers a video element actually requires; only a plain,
      // rangeless request still goes through `net.fetch` below.
      const rangeHeader = request.headers.get('Range')
      const rangeMatch = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader) : null

      if (rangeMatch) {
        const totalSize = assetStat.size
        const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0
        const end = rangeMatch[2] ? Math.min(Number(rangeMatch[2]), totalSize - 1) : totalSize - 1
        const chunkSize = end - start + 1

        const fileHandle = await openFile(resolvedAssetPath, 'r')

        try {
          const buffer = Buffer.alloc(chunkSize)

          await fileHandle.read(buffer, 0, chunkSize, start)

          return new Response(buffer, {
            headers: {
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Content-Type': mimeType,
            },
            status: 206,
          })
        } finally {
          await fileHandle.close()
        }
      }

      const fileResponse = await net.fetch(pathToFileURL(resolvedAssetPath).toString())

      if (!fileResponse.ok) {
        continue
      }

      const responseHeaders = new Headers(fileResponse.headers)
      responseHeaders.set('Content-Type', mimeType)
      responseHeaders.set('Accept-Ranges', 'bytes')

      return new Response(fileResponse.body, {
        headers: responseHeaders,
        status: fileResponse.status,
      })
    }

    return new Response(null, { status: 404 })
  } catch {
    return new Response(null, { status: 404 })
  }
}

function createWindow() {
  // Start wide enough for the app sidebar and the editor's side panels to sit
  // inline (their drawer thresholds are 1024px / 1280px, src/hooks/use-mobile.ts),
  // capped to the screen. Electron's own default, 800×600, would open with all
  // three as drawers.
  const workArea = screen.getPrimaryDisplay().workAreaSize

  // Started at login (SLJ-129): just the menu bar icon until it's opened.
  const startHidden = isBackgroundSupported && isStartingHidden()
  win = new BrowserWindow({
    show: !startHidden,
    width: Math.min(1440, workArea.width),
    height: Math.min(900, workArea.height),
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    // The renderer draws its own title bar (`WindowTitleBar` in
    // src/components/ui/window-title-bar.tsx) holding the sidebar toggle,
    // back/forward and recently viewed. The OS keeps drawing only the window
    // controls: macOS's traffic lights, centred in the 42px bar (the renderer
    // leaves room for them), or on Windows/Linux the min/max/close overlay on
    // the right. Keep the 42px here in sync with `--app-titlebar-height` in
    // src/index.css. The traffic lights' button frame is 16px tall, so y = 13
    // would centre the frame at 21px, but the circles sit low in that frame:
    // y = 12 lines them up by eye with the bar's own icon buttons (checked on
    // macOS 2026-09-29).
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 14, y: 12 } }
      : { titleBarOverlay: { color: '#00000000', height: 42, symbolColor: '#78716c' } }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // Electron's defaults, pinned so an edit can't weaken them silently: the
      // page gets only the preload's bridges, never Node (see
      // electron/window-security.ts).
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  lockDownWindow(win, [VITE_DEV_SERVER_URL ?? pathToFileURL(path.join(RENDERER_DIST, 'index.html')).href])
  background.attach(win, { hidden: startHidden })
  loadApp(win)
}

// Keep sharing in the background (SLJ-129), for the open profile: its saved
// answer, and whether it has anything to share.
let isAskingKeepSharing = false
const background = createBackground({
  ask: (target) => {
    isAskingKeepSharing = true
    if (!target.isVisible()) target.show()
    target.webContents.send('background:ask-keep-sharing')
  },
  hasSomethingToShare: () => {
    if (!getActiveProfile()) return false
    const store = profile.courseSharingStore
    return (
      Object.keys(store.get('published') ?? {}).length > 0 ||
      Object.keys(store.get('followed') ?? {}).length > 0 ||
      (store.get('imports') ?? []).length > 0
    )
  },
  keepSharing: () => (getActiveProfile() ? profile.preferencesStore.get('keepSharingInBackground') : false),
  texts: () => {
    const preferred = getActiveProfile() ? profile.preferencesStore.get('locale') : undefined
    const locale = isLocale(preferred) ? preferred : 'en'
    const store = profile.courseSharingStore
    const count = Object.keys(store.get('published') ?? {}).length + Object.keys(store.get('followed') ?? {}).length
    return {
      open: backgroundText(locale, 'trayOpen'),
      quit: backgroundText(locale, 'trayQuit'),
      status: backgroundText(locale, 'trayStatus', { count }),
      tooltip: backgroundText(locale, 'trayTooltip'),
    }
  },
})

// Loads the app at its start page (also after a profile switch).
function loadApp(window: BrowserWindow): void {
  if (VITE_DEV_SERVER_URL) {
    void window.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void window.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open; one hidden in
  // the background (SLJ-129) is shown again.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    background.show()
  }
})

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) {
    return
  }

  protocol.handle('matko-asset', handleCourseAssetRequest)
  lockDownSession(session.defaultSession)
  createWindow()
  startProfile()
})

// The open profile's background work: its P2P worker (on its own p2p/ store)
// and sharing. The launcher (no profile open) only picks or creates one: no
// worker, no sharing.
function startProfile(): void {
  if (!getActiveProfile()) {
    return
  }

  spawnBareWorker()
  const opened = profile
  // Before sharing starts: an update interrupted by a crash must not leave a
  // course folder missing. (The publisher identity starts locked: published
  // courses are shared by their code until the password is given.)
  void cleanUpInterruptedCourseUpdates()
    .catch((error) => console.error('[course-sharing] cleanup failed:', error))
    .then(() => (profile === opened ? followBuiltInCourses(opened.courseSharing) : undefined))
    .then(() => (profile === opened ? resumeImports(opened) : undefined))
    .catch((error) => console.error('[course-sharing] following the built-in course failed:', error))
    .then(() =>
      profile === opened
        ? Promise.all([opened.courseSharing.start(), opened.programSharing.start(), opened.maintainers.start()])
        : undefined,
    )
}

// The built-in course, once installed as a published course (SLJ-115), is
// followed for updates like an imported one.
async function followBuiltInCourses(courseSharing: CourseSharing): Promise<void> {
  for (const source of await readBundledCourseSources()) {
    if (await readImportedCourseVersion(source.courseId)) {
      courseSharing.followBuiltIn(source)
    }
  }
}

// Opens another profile (or the launcher, with null) in the running app
// (SLJ-57): close this profile's services and stop its worker, open the next
// one's stores and start its worker, then reload the window at Home, so
// nothing on screen or in the renderer's caches belongs to the previous one.
let switching: Promise<void> = Promise.resolve()

// Removes the open profile (SLJ-61): its identity's password first (if it has
// one), then, like a switch to the launcher, close its services and stop its
// worker, and only then delete its folder, so nothing still writes into it.
async function removeCurrentProfile(password: unknown): Promise<RemoveProfileResult> {
  const removed = getActiveProfile()
  if (!removed) {
    throw new Error('No profile is open')
  }

  if (profile.publisherIdentity.exists()) {
    if (typeof password !== 'string' || !password) return { error: 'passwordRequired' }
    if (!(await profile.publisherIdentity.checkPassword(password))) return { error: 'wrongPassword' }
  }

  const removing = switching.then(async () => {
    profile.close()
    await stopBareWorker()
    setActiveProfile(null)
    profile = openProfileServices(getProfileDataDir())
    await removeProfile(getBaseDataDir(), removed.id)
    startProfile()
    if (win) loadApp(win)
  })
  switching = removing.catch(() => {})
  await removing
  return { removed: true }
}

function switchProfile(profileId: string | null): Promise<void> {
  switching = switching.then(async () => {
    profile.close()
    await stopBareWorker()
    setActiveProfile(profileId)
    profile = openProfileServices(getProfileDataDir())
    startProfile()
    if (win) loadApp(win)
  })
  return switching
}
