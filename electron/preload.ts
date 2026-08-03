import { ipcRenderer, contextBridge } from 'electron'
import type {
  CreateCourseDraftInput,
  CreateCourseDraftResult,
  CourseDetails,
  CourseSummary,
} from '../src/lib/course-package'
import type { Locale } from '../src/lib/i18n'
import type { UserPreferences } from '../src/lib/preferences'

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
  createDraft(input: CreateCourseDraftInput) {
    return ipcRenderer.invoke('courses:create-draft', input) as Promise<CreateCourseDraftResult>
  },
  get(courseId: string, locale?: Locale) {
    return ipcRenderer.invoke('courses:get', courseId, locale) as Promise<CourseDetails | null>
  },
  list(locale?: Locale) {
    return ipcRenderer.invoke('courses:list', locale) as Promise<CourseSummary[]>
  },
  remove(courseId: string) {
    return ipcRenderer.invoke('courses:remove', courseId) as Promise<void>
  },
})
