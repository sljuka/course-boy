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

// The Approvals page's groups (SLJ-109).
export const APPROVAL_GROUPS = [
  "waiting-for-you",
  "waiting-for-others",
  "changes-requested",
  "approved",
  "replaced",
] as const
export type ApprovalGroup = (typeof APPROVAL_GROUPS)[number]

// A version proposed for a shared course, anyone's, waiting or decided.
export type ApprovalItem = {
  // Publisher ids of the maintainers who approved it (its proposer too).
  approvedBy: string[]
  changesRequested: { note: string; publisherId: string }[]
  courseId: string | null
  // When it went online or was replaced (ms), null while waiting.
  decidedAt: number | null
  // Its proposer's publisher id.
  from: string
  group: ApprovalGroup
  hash: string
  // Proposed by this profile.
  mine: boolean
  // Maintainers who haven't approved it yet, while it waits.
  missing: string[]
  proposedAt: number
  publicId: string
  // How many must approve it.
  quorum: number
  // The course's title, as the proposal names it.
  title: string | null
  version: string
}

// Every proposal, and how many shared courses this profile maintains.
export type ApprovalsList = { items: ApprovalItem[]; maintained: number }

export type ProposalChange = { kind: "added" | "changed" | "removed"; path: string }

// A proposal's review: its release notes since the version online now (the
// author's notes and changes in course terms), and the files it changes.
export type ProposalReview = {
  changes: ProposalChange[]
  releaseNotes: CourseChangelogEntry[]
  version: string
}
