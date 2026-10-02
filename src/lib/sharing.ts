// Publish puts a course's current published version online; there is no separate
// "share" step (SLJ-38). The code students use is the course's drive key, the same
// for every version of the course.

// - not-shared: never published, or the teacher hasn't given the sharing consent.
// - sharing: being put online right now.
// - shared: online (or, for an imported course, being shared with classmates).
// - waiting: couldn't go online yet (worker not ready, offline); retried later.
export type CourseSharingStatus = 'not-shared' | 'sharing' | 'shared' | 'waiting'

export type CourseSharingInfo = {
  // Known once the course has been shared at least once; stays valid afterwards.
  code: string | null
  status: CourseSharingStatus
}

export type ImportCourseInput = {
  code: string
}

export type ImportCourseResult = {
  courseId: string
}
