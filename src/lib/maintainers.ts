import type { CourseChangelogEntry } from "./course-package"

// Courses maintained by several publishers (SLJ-11): what the renderer sees.
// The main process decides (electron/maintainers.ts); a version goes online
// only when more than half of the maintainers approve it.

// A course's maintainers, as its editor shows them.
export type MaintainersInfo = {
  // Notes from maintainers who asked for changes to our proposal, by
  // publisher id.
  changesRequested: Record<string, string>
  members: { publisherId: string }[]
  // Our version waiting for approval, if any.
  proposal: { version: string } | null
  // How many must approve a version.
  quorum: number
  role: "maintainer" | "owner"
  // The shared course's code, once it's online.
  sharedKey: string | null
}

// A version another maintainer proposed, waiting for this maintainer.
export type ApprovalItem = {
  courseId: string | null
  from: string
  hash: string
  publicId: string
  // The course's title, as the proposal names it.
  title: string | null
  version: string
}

export type ProposalChange = { kind: "added" | "changed" | "removed"; path: string }

// A proposal's review: its release notes since the version online now (the
// author's notes and changes in course terms), and the files it changes.
export type ProposalReview = {
  changes: ProposalChange[]
  releaseNotes: CourseChangelogEntry[]
  version: string
}
