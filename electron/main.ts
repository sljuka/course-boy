import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import Store from 'electron-store'
import { spawnBareWorker } from './bare-worker'
import { getCourseDetails, getCourseVersionHistory, listCourses, resolvePackageDirectoryCandidates } from './course-registry'
import {
  createLocalCourseDraft,
  createLocalCourseLesson,
  createLocalCourseSection,
  cutLocalCourseVersion,
  ensureLocalCoursesRoot,
  getLocalCourseLessonTestDraft,
  publishLocalCourseVersion,
  removeLocalCourse,
  revertLocalCourseDraftToVersion,
  updateLocalCourseDraftMetadata,
  updateLocalCourseLessonContent,
  updateLocalCourseLessonTest,
  uploadLocalCourseAsset,
} from './course-paths'
import { assetMimeTypesByExtension, resolveAssetFilename } from '../src/lib/course-asset-id'
import type {
  CreateCourseDraftInput,
  CreateCourseLessonInput,
  CreateCourseSectionInput,
  CutCourseVersionInput,
  GetLessonTestDraftInput,
  PublishCourseVersionInput,
  RevertCourseDraftInput,
  SaveLessonTestInput,
  UpdateCourseDraftMetadataInput,
  UpdateLessonContentInput,
  UploadCourseAssetInput,
} from '../src/lib/course-package'
import type { Locale } from '../src/lib/i18n'

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
type UserPreferences = {
  category?: Category
  locale?: Locale
  nickname?: string
  role?: UserRole
}

const preferencesStore = new Store<UserPreferences>()

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

    return preferencesStore.store
  },
)

ipcMain.handle('preferences:reset-onboarding', () => {
  preferencesStore.delete('nickname')
  preferencesStore.delete('category')
  preferencesStore.delete('role')

  return preferencesStore.store
})

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

ipcMain.handle('courses:create-lesson', (_event, input: CreateCourseLessonInput) => {
  return createLocalCourseLesson(input)
})

ipcMain.handle('courses:update-lesson-content', (_event, input: UpdateLessonContentInput) => {
  return updateLocalCourseLessonContent(input)
})

ipcMain.handle('courses:save-lesson-test', (_event, input: SaveLessonTestInput) => {
  return updateLocalCourseLessonTest(input)
})

ipcMain.handle('courses:get-lesson-test-draft', (_event, input: GetLessonTestDraftInput) => {
  return getLocalCourseLessonTestDraft(input)
})

ipcMain.handle(
  'courses:update-draft-metadata',
  (_event, input: UpdateCourseDraftMetadataInput) => {
    return updateLocalCourseDraftMetadata(input)
  },
)

ipcMain.handle('courses:remove', (_event, courseId: string) => {
  return removeLocalCourse(courseId)
})

ipcMain.handle('courses:upload-asset', (_event, input: UploadCourseAssetInput) => {
  return uploadLocalCourseAsset(input)
})

ipcMain.handle('courses:get-version-history', (_event, courseId: string) => {
  return ensureLocalCoursesRoot().then((coursesRoot) =>
    getCourseVersionHistory(coursesRoot, courseId),
  )
})

ipcMain.handle('courses:cut-version', (_event, input: CutCourseVersionInput) => {
  return cutLocalCourseVersion(input)
})

ipcMain.handle('courses:revert-to-version', (_event, input: RevertCourseDraftInput) => {
  return revertLocalCourseDraftToVersion(input)
})

ipcMain.handle('courses:publish-version', (_event, input: PublishCourseVersionInput) => {
  return publishLocalCourseVersion(input)
})

async function handleCourseAssetRequest(request: Request): Promise<Response> {
  try {
    const requestUrl = new URL(request.url)
    const courseId = requestUrl.hostname
    const filename = resolveAssetFilename(
      decodeURIComponent(requestUrl.pathname.replace(/^\//, '')),
    )

    if (!courseId || !filename) {
      return new Response(null, { status: 404 })
    }

    const localCoursesRoot = await ensureLocalCoursesRoot()
    const courseRootPath = path.resolve(localCoursesRoot, courseId)
    const relativeToCoursesRoot = path.relative(localCoursesRoot, courseRootPath)

    if (relativeToCoursesRoot.startsWith('..') || path.isAbsolute(relativeToCoursesRoot)) {
      return new Response(null, { status: 404 })
    }

    for (const packageDirectoryPath of resolvePackageDirectoryCandidates(courseRootPath)) {
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

      const fileResponse = await net.fetch(pathToFileURL(resolvedAssetPath).toString())

      if (!fileResponse.ok) {
        continue
      }

      const responseHeaders = new Headers(fileResponse.headers)
      responseHeaders.set('Content-Type', mimeType)

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
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
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
  protocol.handle('matko-asset', handleCourseAssetRequest)
  createWindow()
  spawnBareWorker()
})
