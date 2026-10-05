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
  // Your own course: known once it has been shared at least once; stays valid
  // afterwards. An imported course: the code it was imported with, to share
  // with classmates; null if the teacher shared it only with chosen students.
  code: string | null
  status: CourseSharingStatus
  // While the course is shared from this device ("Online"): how many peers
  // are connected for it right now (the teacher, classmates); null otherwise.
  peers: number | null
  // Imported courses only: when this device first imported it.
  importedAt: string | null
  // Imported courses only.
  update: CourseUpdateInfo | null
  // A newer version that claims to come from a different source than this
  // course was imported from: refused, and the student is warned.
  refusedUpdate: { version: string } | null
  // Imported courses only: the versions kept on this device (newest first) and
  // the one in use. Switching between them needs no download (SLJ-40).
  versions: { current: string | null; kept: string[] } | null
}

// An import or an update download in progress (SLJ-43), polled by its id.
// - finding: no one sharing the course is reachable yet; it keeps waiting until
//   someone is, or the student cancels.
// - downloading: `bytesDone` of `bytesTotal` (exact, known up front; for an
//   update only what changed), at `speed` bytes per second.
export type TransferPhase = 'finding' | 'downloading' | 'done' | 'cancelled' | 'error'

export type TransferInfo = {
  bytesDone: number
  bytesTotal: number | null
  // An import's course titles by language, once its manifest has arrived
  // (SLJ-49); null before that, and for updates.
  course: { defaultLocale: string | null; titles: Record<string, string> } | null
  elapsedMs: number
  phase: TransferPhase
  speed: number
}

// Cancelling is not an error: the call returns `{ cancelled: true }`.
export type Cancelled = { cancelled: true }

export type ApplyCourseUpdateResult = { version: string } | Cancelled

export type ImportCourseInput = {
  code: string
  // Chosen by the caller, to poll progress (`getTransfer`) and cancel.
  transferId?: string
}

export type ImportCourseResult = { courseId: string } | Cancelled
