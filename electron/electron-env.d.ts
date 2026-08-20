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
    createLesson: (
      input: import('../src/lib/course-package').CreateCourseLessonInput,
    ) => Promise<import('../src/lib/course-package').CreateCourseLessonResult>
    updateDraftMetadata: (
      input: import('../src/lib/course-package').UpdateCourseDraftMetadataInput,
    ) => Promise<void>
    updateLessonContent: (
      input: import('../src/lib/course-package').UpdateLessonContentInput,
    ) => Promise<void>
    saveLessonTest: (
      input: import('../src/lib/course-package').SaveLessonTestInput,
    ) => Promise<void>
    getLessonTestDraft: (
      input: import('../src/lib/course-package').GetLessonTestDraftInput,
    ) => Promise<import('../src/lib/course-package').SharedTestDefinition | null>
    get: (
      courseId: string,
      locale?: import('../src/lib/i18n').Locale,
    ) => Promise<import('../src/lib/course-package').CourseDetails | null>
    list: (
      locale?: import('../src/lib/i18n').Locale,
    ) => Promise<import('../src/lib/course-package').CourseSummary[]>
    remove: (courseId: string) => Promise<void>
  }
  preferences: {
    get: () => Promise<import('../src/lib/preferences').UserPreferences>
    resetOnboarding: () => Promise<import('../src/lib/preferences').UserPreferences>
    set: (
      preferences: Partial<import('../src/lib/preferences').UserPreferences>,
    ) => Promise<import('../src/lib/preferences').UserPreferences>
  }
}
