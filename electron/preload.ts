import { ipcRenderer, contextBridge } from 'electron'
import type {
  CreateCourseDraftInput,
  CreateCourseDraftResult,
  CreateCourseLessonInput,
  CreateCourseLessonResult,
  CreateCourseSectionInput,
  CreateCourseSectionResult,
  CourseDetails,
  CourseSummary,
  GetLessonTestDraftInput,
  SaveLessonTestInput,
  SharedTestDefinition,
  UpdateCourseDraftMetadataInput,
  UpdateLessonContentInput,
  UploadCourseAssetInput,
  UploadCourseAssetResult,
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
  createSection(input: CreateCourseSectionInput) {
    return ipcRenderer.invoke('courses:create-section', input) as Promise<CreateCourseSectionResult>
  },
  createLesson(input: CreateCourseLessonInput) {
    return ipcRenderer.invoke('courses:create-lesson', input) as Promise<CreateCourseLessonResult>
  },
  updateDraftMetadata(input: UpdateCourseDraftMetadataInput) {
    return ipcRenderer.invoke('courses:update-draft-metadata', input) as Promise<void>
  },
  updateLessonContent(input: UpdateLessonContentInput) {
    return ipcRenderer.invoke('courses:update-lesson-content', input) as Promise<void>
  },
  saveLessonTest(input: SaveLessonTestInput) {
    return ipcRenderer.invoke('courses:save-lesson-test', input) as Promise<void>
  },
  getLessonTestDraft(input: GetLessonTestDraftInput) {
    return ipcRenderer.invoke('courses:get-lesson-test-draft', input) as Promise<SharedTestDefinition | null>
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
  uploadAsset(input: UploadCourseAssetInput) {
    return ipcRenderer.invoke('courses:upload-asset', input) as Promise<UploadCourseAssetResult>
  },
})
