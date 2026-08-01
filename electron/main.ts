import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import Store from 'electron-store'
import { getCourseDetails, listCourses } from './course-registry'
import { ensureLocalCoursesRoot } from './course-paths'
import type { Locale } from '../src/lib/i18n'

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

app.whenReady().then(createWindow)
