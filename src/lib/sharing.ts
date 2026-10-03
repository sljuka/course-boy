import type { CourseChangelogEntry } from './course-package'

// Publish puts a course's current published version online; there is no separate
// "share" step (SLJ-38). The code students use is the course's drive key, the same
// for every version of the course.

// - not-shared: never published, or the teacher hasn't given the sharing consent.
// - sharing: being put online right now.
// - shared: online (or, for an imported course, being shared with classmates).
// - waiting: couldn't go online yet (worker not ready, offline); retried later.
export type CourseSharingStatus = 'not-shared' | 'sharing' | 'shared' | 'waiting'

// A newer version of an imported course, offered to the student (SLJ-39).
// - regular: new or reworked content.
// - recommended: some version newer than the student's fixes mistakes.
export type CourseUpdateKind = 'regular' | 'recommended'

export type CourseUpdateInfo = {
  // Release notes of every version newer than the installed one, newest first.
  changelog: CourseChangelogEntry[]
  // The major version goes up: shown as a big update, with its release notes.
  isMajor: boolean
  kind: CourseUpdateKind
  version: string
  // prominent: a banner on the course page and a badge on Home. quiet: only a
  // line on the course page, after "Finish on this version".
  visibility: 'prominent' | 'quiet'
}

export type CourseSharingInfo = {
  // Known once the course has been shared at least once; stays valid afterwards.
  code: string | null
  status: CourseSharingStatus
  // Imported courses only.
  update: CourseUpdateInfo | null
  // A newer version that claims to come from a different source than this
  // course was imported from: refused, and the student is warned.
  refusedUpdate: { version: string } | null
  // Imported courses only: the versions kept on this device (newest first) and
  // the one in use. Switching between them needs no download (SLJ-40).
  versions: { current: string | null; kept: string[] } | null
}

export type ApplyCourseUpdateResult = {
  version: string
}

export type ImportCourseInput = {
  code: string
}

export type ImportCourseResult = {
  courseId: string
}
