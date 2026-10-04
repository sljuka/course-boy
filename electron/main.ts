import { app, BrowserWindow, ipcMain, net, protocol, screen, session } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { open as openFile, stat as statFile } from 'node:fs/promises'
import path from 'node:path'
import Store from 'electron-store'
import {
  checkUpdate,
  downloadUpdate,
  followCourse,
  getCreatorKey,
  importCourse,
  onDriveChanged,
  publishCourse,
  spawnBareWorker,
  stopSharing,
} from './bare-worker'
import { createCourseSharing, type CourseSharingState } from './course-sharing'
import { lockDownSession, lockDownWindow } from './window-security'
import { getCourseDetails, getCourseVersionHistory, listCourses, resolvePackageDirectoryCandidates } from './course-registry'
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
  listImportedCourseVersions,
  listPublishedLocalCourseIds,
  migrateImportedCourse,
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
  updateLocalCourseSection,
  updateLocalCourseSectionTest,
  updateLocalCourseSectionTestMetadata,
  uploadCourseAssetFromBytes,
  uploadLocalCourseAsset,
} from './course-paths'
import { assetMimeTypesByExtension, resolveAssetFilename } from '../src/lib/course-asset-id'
import { isValidCourseId } from '../src/lib/course-id'
import { parseCourseListView, type CourseListView } from '../src/lib/course-list-view'
import { parseExplorerPanelPreference, type ExplorerPanelPreference } from '../src/lib/explorer-panel'
import { parseRecentlyViewedEntries, type RecentlyViewedEntry } from '../src/lib/recently-viewed'
import type {
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
  UpdateCourseSectionInput,
  UpdateCourseSectionTestMetadataInput,
  UpdateLessonContentInput,
  UpdateSectionIntroInput,
  RemoveSectionIntroInput,
  UploadCourseAssetBytesInput,
  UploadCourseAssetInput,
} from '../src/lib/course-package'
import type { Locale } from '../src/lib/i18n'
import type {
  ApplyCourseUpdateResult,
  CourseSharingInfo,
  CourseUpdateInfo,
  ImportCourseInput,
  ImportCourseResult,
} from '../src/lib/sharing'

// Two windows against the same userData directory raced their own
// autosave writes with no conflict detection (see "Previewing a draft
// test" / draft persistence notes in docs/persistence-notes.md) — each one
// periodically PUTs its own full in-memory snapshot of a course's draft,
// diffed only against what it last saved itself, so a stale second window
// silently overwrote a teacher's freshly-added exercises. Refusing a
// second instance closes that off at the source. The lock is scoped to
// the userData directory (the same mechanism separate `--user-data-dir`
// profiles already rely on for the run-desktop driver, or for testing
// multiple P2P peer identities side by side), so it only blocks a second
// window sharing the *same* profile — never two instances pointed at
// different ones.
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) {
        win.restore()
      }

      win.focus()
    }
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
  myCoursesView?: CourseListView
  versionsPanel?: ExplorerPanelPreference
  hasAcknowledgedCreatorKey?: boolean
  showBundledCourses?: boolean
  locale?: Locale
  nickname?: string
  persona?: Persona
  previousVersionsToKeep?: number
  recentlyViewed?: RecentlyViewedEntry[]
  role?: UserRole
  theme?: Theme
}

const preferencesStore = new Store<UserPreferences>()

// Where shared courses stand: the teacher's published courses (with their code) and
// the student's imported courses (where each came from). Main-process only: the
// renderer can read a course's status but never write where a course comes from.
const courseSharingStore = new Store<CourseSharingState>({
  defaults: { followed: {}, published: {} },
  name: 'course-sharing',
})

const courseSharing = createCourseSharing({
  applyUpdateFiles: (expected, download) =>
    applyImportedCourseUpdate(expected, download, {
      previousToKeep: clampPreviousVersionsToKeep(preferencesStore.get('previousVersionsToKeep')),
    }),
  hasConsent: () => preferencesStore.get('hasAcknowledgedCreatorKey') === true,
  listInstalledVersions: listImportedCourseVersions,
  listPublishedCourseIds: listPublishedLocalCourseIds,
  readInstalledVersion: readImportedCourseVersion,
  switchInstalledVersion: switchImportedCourseVersion,
  store: {
    read: () => ({
      followed: courseSharingStore.get('followed'),
      published: courseSharingStore.get('published'),
    }),
    write: (state) => courseSharingStore.set(state),
  },
  worker: { checkUpdate, downloadUpdate, followCourse, importCourse, publishCourse, stopSharing },
})

onDriveChanged((driveKey) => courseSharing.onDriveChanged(driveKey))

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
  return preferencesStore.store
})

ipcMain.handle(
  'preferences:set',
  (_event, preferences: Partial<UserPreferences>) => {
    if (typeof preferences.locale === 'string') {
      preferencesStore.set('locale', preferences.locale)
    }

    if (typeof preferences.nickname === 'string') {
      preferencesStore.set('nickname', preferences.nickname)
    }

    if (typeof preferences.category === 'string') {
      preferencesStore.set('category', preferences.category)
    }

    if (typeof preferences.role === 'string') {
      preferencesStore.set('role', preferences.role)
    }

    if (typeof preferences.persona === 'string') {
      preferencesStore.set('persona', preferences.persona)
    }

    if (typeof preferences.theme === 'string') {
      preferencesStore.set('theme', preferences.theme)
    }

    // Applied at the next update, not now: lowering it never deletes a version
    // the student might be about to go back to.
    if (typeof preferences.previousVersionsToKeep === 'number') {
      preferencesStore.set('previousVersionsToKeep', clampPreviousVersionsToKeep(preferences.previousVersionsToKeep))
    }

    if (typeof preferences.showBundledCourses === 'boolean') {
      preferencesStore.set('showBundledCourses', preferences.showBundledCourses)
    }

    if (typeof preferences.hasAcknowledgedCreatorKey === 'boolean') {
      const hadConsent = preferencesStore.get('hasAcknowledgedCreatorKey') === true
      preferencesStore.set('hasAcknowledgedCreatorKey', preferences.hasAcknowledgedCreatorKey)

      if (!hadConsent && preferences.hasAcknowledgedCreatorKey) {
        courseSharing.onConsentGiven()
      }
    }

    // Validated rather than trusted: it's a list the renderer builds, and only
    // well-formed entries (in-app paths, known kinds, capped length) persist.
    if (typeof preferences.explorerPanel === 'object' && preferences.explorerPanel !== null) {
      preferencesStore.set('explorerPanel', parseExplorerPanelPreference(preferences.explorerPanel))
    }

    if (typeof preferences.myCoursesView === 'string') {
      preferencesStore.set('myCoursesView', parseCourseListView(preferences.myCoursesView))
    }

    if (typeof preferences.versionsPanel === 'object' && preferences.versionsPanel !== null) {
      preferencesStore.set('versionsPanel', parseExplorerPanelPreference(preferences.versionsPanel))
    }

    if (Array.isArray(preferences.recentlyViewed)) {
      preferencesStore.set('recentlyViewed', parseRecentlyViewedEntries(preferences.recentlyViewed))
    }

    return preferencesStore.store
  },
)

ipcMain.handle('preferences:reset-onboarding', () => {
  preferencesStore.delete('nickname')
  preferencesStore.delete('category')
  preferencesStore.delete('role')
  preferencesStore.delete('persona')
  preferencesStore.delete('recentlyViewed')

  return preferencesStore.store
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
  (_event, courseId: string, locale?: Locale) => {
    return ensureLocalCoursesRoot().then((coursesRoot) =>
      getCourseDetails(coursesRoot, courseId, locale),
    )
  },
)

ipcMain.handle('courses:create-draft', (_event, input: CreateCourseDraftInput) => {
  return createLocalCourseDraft(input)
})

ipcMain.handle('courses:create-section', (_event, input: CreateCourseSectionInput) => {
  return createLocalCourseSection(input)
})

ipcMain.handle('courses:update-section', (_event, input: UpdateCourseSectionInput) => {
  return updateLocalCourseSection(input)
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
  await courseSharing.forgetCourse(courseId)
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
  await publishLocalCourseVersion(input)
  // Publish puts the version online; that runs in the background and can't make
  // Publish fail (see electron/course-sharing.ts).
  courseSharing.onPublished(input.courseId)
})

ipcMain.handle('sharing:get-creator-key', () => {
  return getCreatorKey()
})

ipcMain.handle('sharing:get-course-sharing', async (_event, courseId: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  return {
    ...courseSharing.getInfo(courseId),
    versions: await courseSharing.getVersions(courseId),
  } satisfies CourseSharingInfo
})

ipcMain.handle('sharing:list-course-updates', () => {
  return courseSharing.listUpdates() satisfies Record<string, CourseUpdateInfo>
})

ipcMain.handle('sharing:apply-course-update', async (_event, courseId: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  const { version } = await courseSharing.applyUpdate(courseId)
  return { version } satisfies ApplyCourseUpdateResult
})

ipcMain.handle('sharing:switch-course-version', async (_event, courseId: string, version: string) => {
  if (!isValidCourseId(courseId) || typeof version !== 'string') {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  await courseSharing.switchVersion(courseId, version)
})

ipcMain.handle('sharing:finish-on-version', (_event, courseId: string) => {
  if (!isValidCourseId(courseId)) {
    throw new Error(`Invalid course id "${courseId}"`)
  }

  courseSharing.finishOnVersion(courseId)
})

ipcMain.handle('sharing:import-course', async (_event, input: ImportCourseInput) => {
  const { courseId } = await courseSharing.importCourse(input.code)
  // The worker lands an import root-only; move it into versions/<v>/ (SLJ-40).
  await migrateImportedCourse(courseId)
  return { courseId } satisfies ImportCourseResult
})

async function handleCourseAssetRequest(request: Request): Promise<Response> {
  try {
    const requestUrl = new URL(request.url)
    const courseId = requestUrl.hostname
    const filename = resolveAssetFilename(
      decodeURIComponent(requestUrl.pathname.replace(/^\//, '')),
    )

    if (!isValidCourseId(courseId) || !filename) {
      return new Response(null, { status: 404 })
    }

    const localCoursesRoot = await ensureLocalCoursesRoot()
    const courseRootPath = path.resolve(localCoursesRoot, courseId)
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

  win = new BrowserWindow({
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

  const indexHtmlPath = path.join(RENDERER_DIST, 'index.html')
  lockDownWindow(win, [VITE_DEV_SERVER_URL ?? pathToFileURL(indexHtmlPath).href])

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(indexHtmlPath)
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
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) {
    return
  }

  protocol.handle('matko-asset', handleCourseAssetRequest)
  lockDownSession(session.defaultSession)
  createWindow()
  spawnBareWorker()
  // Before sharing starts: an update interrupted by a crash must not leave a
  // course folder missing.
  void cleanUpInterruptedCourseUpdates()
    .catch((error) => console.error('[course-sharing] cleanup failed:', error))
    .then(() => courseSharing.start())
})
