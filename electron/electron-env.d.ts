/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  courses: {
    createDraft: (
      input: import('../src/lib/course-package').CreateCourseDraftInput,
    ) => Promise<import('../src/lib/course-package').CreateCourseDraftResult>
    createSection: (
      input: import('../src/lib/course-package').CreateCourseSectionInput,
    ) => Promise<import('../src/lib/course-package').CreateCourseSectionResult>
    updateSection: (
      input: import('../src/lib/course-package').UpdateCourseSectionInput,
    ) => Promise<void>
    createLesson: (
      input: import('../src/lib/course-package').CreateCourseLessonInput,
    ) => Promise<import('../src/lib/course-package').CreateCourseLessonResult>
    updateDraftMetadata: (
      input: import('../src/lib/course-package').UpdateCourseDraftMetadataInput,
    ) => Promise<void>
    updateLessonContent: (
      input: import('../src/lib/course-package').UpdateLessonContentInput,
    ) => Promise<void>
    updateSectionIntro: (
      input: import('../src/lib/course-package').UpdateSectionIntroInput,
    ) => Promise<void>
    removeSectionIntro: (
      input: import('../src/lib/course-package').RemoveSectionIntroInput,
    ) => Promise<void>
    saveLessonTest: (
      input: import('../src/lib/course-package').SaveLessonTestInput,
    ) => Promise<void>
    getLessonTestDraft: (
      input: import('../src/lib/course-package').GetLessonTestDraftInput,
    ) => Promise<import('../src/lib/course-package').SharedTestDefinition | null>
    createSectionTest: (
      input: import('../src/lib/course-package').CreateCourseSectionTestInput,
    ) => Promise<import('../src/lib/course-package').CreateCourseSectionTestResult>
    saveSectionTest: (
      input: import('../src/lib/course-package').SaveSectionTestInput,
    ) => Promise<void>
    getSectionTestDraft: (
      input: import('../src/lib/course-package').GetSectionTestDraftInput,
    ) => Promise<import('../src/lib/course-package').SharedTestDefinition | null>
    updateSectionTestMetadata: (
      input: import('../src/lib/course-package').UpdateCourseSectionTestMetadataInput,
    ) => Promise<void>
    deleteSection: (
      input: import('../src/lib/course-package').DeleteCourseSectionInput,
    ) => Promise<void>
    deleteLesson: (
      input: import('../src/lib/course-package').DeleteCourseLessonInput,
    ) => Promise<void>
    deleteSectionTest: (
      input: import('../src/lib/course-package').DeleteCourseSectionTestInput,
    ) => Promise<void>
    get: (
      courseId: string,
      locale?: import('../src/lib/i18n').Locale,
    ) => Promise<import('../src/lib/course-package').CourseDetails | null>
    list: (
      locale?: import('../src/lib/i18n').Locale,
    ) => Promise<import('../src/lib/course-package').CourseSummary[]>
    remove: (courseId: string) => Promise<void>
    openInFileSystem: (courseId: string) => Promise<void>
    uploadAsset: (
      input: import('../src/lib/course-package').UploadCourseAssetInput,
    ) => Promise<import('../src/lib/course-package').UploadCourseAssetResult>
    uploadAssetBytes: (
      input: import('../src/lib/course-package').UploadCourseAssetBytesInput,
    ) => Promise<import('../src/lib/course-package').UploadCourseAssetBytesResult>
    applySvgPreset: (
      input: import('../src/lib/course-package').ApplyCourseSvgPresetInput,
    ) => Promise<import('../src/lib/course-package').ApplyCourseSvgPresetResult>
    getVersionHistory: (
      courseId: string,
    ) => Promise<import('../src/lib/course-package').CourseVersionHistory | null>
    previewDraftChanges: (
      courseId: string,
    ) => Promise<import('../src/lib/course-package').DraftChangesPreview>
    cutVersion: (
      input: import('../src/lib/course-package').CutCourseVersionInput,
    ) => Promise<import('../src/lib/course-package').CutCourseVersionResult>
    getUnusedDraftAssets: (
      courseId: string,
    ) => Promise<import('../src/lib/course-package').UnusedDraftAsset[]>
    revertToVersion: (
      input: import('../src/lib/course-package').RevertCourseDraftInput,
    ) => Promise<void>
    publishVersion: (
      input: import('../src/lib/course-package').PublishCourseVersionInput,
    ) => Promise<void>
  }
  preferences: {
    get: () => Promise<import('../src/lib/preferences').UserPreferences>
    resetOnboarding: () => Promise<import('../src/lib/preferences').UserPreferences>
    set: (
      preferences: Partial<import('../src/lib/preferences').UserPreferences>,
    ) => Promise<import('../src/lib/preferences').UserPreferences>
  }
  profiles: {
    getState: () => Promise<import('../src/lib/profiles').ProfilesState>
    create: (input: { locale?: string; name: string }) => Promise<void>
    open: (profileId: string) => Promise<void>
    switchProfile: () => Promise<void>
  }
  sharing: {
    getCreatorKey: () => Promise<string>
    getIdentityBackupStatus: () => Promise<import('../src/lib/identity-backup').IdentityBackupStatus>
    saveIdentityBackup: (
      password: string,
      includeCourseId?: string,
    ) => Promise<import('../src/lib/identity-backup').SaveIdentityBackupResult>
    getCourseSharing: (courseId: string) => Promise<import('../src/lib/sharing').CourseSharingInfo>
    listCourseUpdates: () => Promise<Record<string, import('../src/lib/sharing').CourseUpdateInfo>>
    applyCourseUpdate: (
      courseId: string,
      transferId?: string,
    ) => Promise<import('../src/lib/sharing').ApplyCourseUpdateResult>
    getTransfer: (transferId: string) => Promise<import('../src/lib/sharing').TransferInfo | null>
    cancelTransfer: (transferId: string) => Promise<void>
    finishOnVersion: (courseId: string) => Promise<void>
    switchCourseVersion: (courseId: string, version: string) => Promise<void>
    importCourse: (
      input: import('../src/lib/sharing').ImportCourseInput,
    ) => Promise<import('../src/lib/sharing').ImportCourseResult>
  }
}
