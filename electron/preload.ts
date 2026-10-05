import { ipcRenderer, contextBridge } from 'electron'
import type {
  ApplyCourseSvgPresetInput,
  ApplyCourseSvgPresetResult,
  CreateCourseDraftInput,
  CreateCourseDraftResult,
  CreateCourseLessonInput,
  CreateCourseLessonResult,
  CreateCourseSectionInput,
  CreateCourseSectionResult,
  CreateCourseSectionTestInput,
  CreateCourseSectionTestResult,
  CourseDetails,
  CourseSummary,
  CourseVersionHistory,
  DraftChangesPreview,
  CutCourseVersionInput,
  CutCourseVersionResult,
  UnusedDraftAsset,
  DeleteCourseLessonInput,
  DeleteCourseSectionInput,
  DeleteCourseSectionTestInput,
  GetLessonTestDraftInput,
  GetSectionTestDraftInput,
  PublishCourseVersionInput,
  RevertCourseDraftInput,
  SaveLessonTestInput,
  SaveSectionTestInput,
  SharedTestDefinition,
  UpdateCourseDraftMetadataInput,
  UpdateCourseSectionInput,
  UpdateCourseSectionTestMetadataInput,
  UpdateLessonContentInput,
  UpdateSectionIntroInput,
  RemoveSectionIntroInput,
  UploadCourseAssetBytesInput,
  UploadCourseAssetBytesResult,
  UploadCourseAssetInput,
  UploadCourseAssetResult,
} from '../src/lib/course-package'
import type { Locale } from '../src/lib/i18n'
import type { UserPreferences } from '../src/lib/preferences'
import type {
  ApplyCourseUpdateResult,
  CourseSharingInfo,
  CourseUpdateInfo,
  ImportCourseInput,
  ImportCourseResult,
  TransferInfo,
} from '../src/lib/sharing'

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
  updateSection(input: UpdateCourseSectionInput) {
    return ipcRenderer.invoke('courses:update-section', input) as Promise<void>
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
  updateSectionIntro(input: UpdateSectionIntroInput) {
    return ipcRenderer.invoke('courses:update-section-intro', input) as Promise<void>
  },
  removeSectionIntro(input: RemoveSectionIntroInput) {
    return ipcRenderer.invoke('courses:remove-section-intro', input) as Promise<void>
  },
  saveLessonTest(input: SaveLessonTestInput) {
    return ipcRenderer.invoke('courses:save-lesson-test', input) as Promise<void>
  },
  getLessonTestDraft(input: GetLessonTestDraftInput) {
    return ipcRenderer.invoke('courses:get-lesson-test-draft', input) as Promise<SharedTestDefinition | null>
  },
  createSectionTest(input: CreateCourseSectionTestInput) {
    return ipcRenderer.invoke('courses:create-section-test', input) as Promise<CreateCourseSectionTestResult>
  },
  saveSectionTest(input: SaveSectionTestInput) {
    return ipcRenderer.invoke('courses:save-section-test', input) as Promise<void>
  },
  getSectionTestDraft(input: GetSectionTestDraftInput) {
    return ipcRenderer.invoke('courses:get-section-test-draft', input) as Promise<SharedTestDefinition | null>
  },
  updateSectionTestMetadata(input: UpdateCourseSectionTestMetadataInput) {
    return ipcRenderer.invoke('courses:update-section-test-metadata', input) as Promise<void>
  },
  deleteSection(input: DeleteCourseSectionInput) {
    return ipcRenderer.invoke('courses:delete-section', input) as Promise<void>
  },
  deleteLesson(input: DeleteCourseLessonInput) {
    return ipcRenderer.invoke('courses:delete-lesson', input) as Promise<void>
  },
  deleteSectionTest(input: DeleteCourseSectionTestInput) {
    return ipcRenderer.invoke('courses:delete-section-test', input) as Promise<void>
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
  openInFileSystem(courseId: string) {
    return ipcRenderer.invoke('courses:open-in-file-system', courseId) as Promise<void>
  },
  uploadAsset(input: UploadCourseAssetInput) {
    return ipcRenderer.invoke('courses:upload-asset', input) as Promise<UploadCourseAssetResult>
  },
  uploadAssetBytes(input: UploadCourseAssetBytesInput) {
    return ipcRenderer.invoke('courses:upload-asset-bytes', input) as Promise<UploadCourseAssetBytesResult>
  },
  applySvgPreset(input: ApplyCourseSvgPresetInput) {
    return ipcRenderer.invoke('courses:apply-svg-preset', input) as Promise<ApplyCourseSvgPresetResult>
  },
  getVersionHistory(courseId: string) {
    return ipcRenderer.invoke('courses:get-version-history', courseId) as Promise<CourseVersionHistory | null>
  },
  // What committing the draft now would record (release notes), read-only.
  previewDraftChanges(courseId: string) {
    return ipcRenderer.invoke('courses:preview-draft-changes', courseId) as Promise<DraftChangesPreview>
  },
  cutVersion(input: CutCourseVersionInput) {
    return ipcRenderer.invoke('courses:cut-version', input) as Promise<CutCourseVersionResult>
  },
  getUnusedDraftAssets(courseId: string) {
    return ipcRenderer.invoke('courses:get-unused-draft-assets', courseId) as Promise<UnusedDraftAsset[]>
  },
  revertToVersion(input: RevertCourseDraftInput) {
    return ipcRenderer.invoke('courses:revert-to-version', input) as Promise<void>
  },
  publishVersion(input: PublishCourseVersionInput) {
    return ipcRenderer.invoke('courses:publish-version', input) as Promise<void>
  },
})

contextBridge.exposeInMainWorld('sharing', {
  getCreatorKey() {
    return ipcRenderer.invoke('sharing:get-creator-key') as Promise<string>
  },
  getCourseSharing(courseId: string) {
    return ipcRenderer.invoke('sharing:get-course-sharing', courseId) as Promise<CourseSharingInfo>
  },
  listCourseUpdates() {
    return ipcRenderer.invoke('sharing:list-course-updates') as Promise<Record<string, CourseUpdateInfo>>
  },
  applyCourseUpdate(courseId: string, transferId?: string) {
    return ipcRenderer.invoke('sharing:apply-course-update', courseId, transferId) as Promise<ApplyCourseUpdateResult>
  },
  getTransfer(transferId: string) {
    return ipcRenderer.invoke('sharing:get-transfer', transferId) as Promise<TransferInfo | null>
  },
  cancelTransfer(transferId: string) {
    return ipcRenderer.invoke('sharing:cancel-transfer', transferId) as Promise<void>
  },
  switchCourseVersion(courseId: string, version: string) {
    return ipcRenderer.invoke('sharing:switch-course-version', courseId, version) as Promise<void>
  },
  finishOnVersion(courseId: string) {
    return ipcRenderer.invoke('sharing:finish-on-version', courseId) as Promise<void>
  },
  importCourse(input: ImportCourseInput) {
    return ipcRenderer.invoke('sharing:import-course', input) as Promise<ImportCourseResult>
  },
})
