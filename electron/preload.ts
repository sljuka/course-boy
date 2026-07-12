import { ipcRenderer, contextBridge } from 'electron'
import type {
  CourseDetails,
  CourseSummary,
} from '../src/lib/course-package'
import type { Locale } from '../src/lib/i18n'
import type { UserPreferences } from '../src/lib/preferences'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('preferences', {
  get() {
    return ipcRenderer.invoke('preferences:get') as Promise<UserPreferences>
  },
  set(preferences: Partial<UserPreferences>) {
    return ipcRenderer.invoke('preferences:set', preferences) as Promise<UserPreferences>
  },
  resetOnboarding() {
    return ipcRenderer.invoke('preferences:reset-onboarding') as Promise<UserPreferences>
  },
})

contextBridge.exposeInMainWorld('courses', {
  get(courseId: string, locale?: Locale) {
    return ipcRenderer.invoke('courses:get', courseId, locale) as Promise<CourseDetails | null>
  },
  list(locale?: Locale) {
    return ipcRenderer.invoke('courses:list', locale) as Promise<CourseSummary[]>
  },
})
