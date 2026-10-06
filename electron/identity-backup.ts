// Saving the publisher identity backup (SLJ-53). The worker encrypts the
// identity with the teacher's password (workers/identity-backup.cjs); this
// asks where to save it, writes it safely, and remembers when and which
// courses it covers, for Settings' "Backed up on …" and "N courses since".
// Main-process only: the renderer gets the status, never the file contents.

import type { IdentityBackupStatus, SaveIdentityBackupResult } from '../src/lib/identity-backup'
import { MIN_BACKUP_PASSWORD_LENGTH } from '../src/lib/identity-backup'

export type IdentityBackupState = {
  // Course ids in the newest backup.
  courseIds?: string[]
  lastBackupAt?: string
}

export type IdentityBackupDeps = {
  // The teacher has given the sharing consent (there's an identity to keep).
  hasIdentity: () => boolean
  // The teacher's published courses, with a title to show on restore.
  listPublishedCourses: () => Promise<{ id: string; title: string }[]>
  // The encrypted file's text, from the worker.
  createBackup: (input: { courses: { id: string; title: string }[]; password: string }) => Promise<string>
  // Where to save it (the OS save dialog), or null if the teacher cancelled.
  chooseSavePath: (suggestedName: string) => Promise<string | null>
  // Writes the file without leaving a half-written one behind.
  writeFileAtomic: (filePath: string, contents: string) => Promise<void>
  now?: () => Date
  store: { read: () => IdentityBackupState; write: (state: IdentityBackupState) => void }
}

export function createIdentityBackupService(deps: IdentityBackupDeps) {
  const now = deps.now ?? (() => new Date())

  return {
    async getStatus(): Promise<IdentityBackupStatus> {
      const state = deps.store.read()
      const available = deps.hasIdentity()
      const backedUp = new Set(state.courseIds ?? [])
      const published = available ? await deps.listPublishedCourses() : []

      return {
        available,
        coursesNotBackedUp: published.filter((course) => !backedUp.has(course.id)).length,
        lastBackupAt: state.lastBackupAt ?? null,
      }
    },

    async save(password: string): Promise<SaveIdentityBackupResult> {
      if (!deps.hasIdentity()) {
        throw new Error('There is no publisher identity to back up yet')
      }
      if (typeof password !== 'string' || [...password].length < MIN_BACKUP_PASSWORD_LENGTH) {
        throw new Error(`The password must have at least ${MIN_BACKUP_PASSWORD_LENGTH} characters`)
      }

      const savedAt = now()
      const filePath = await deps.chooseSavePath(`matko-identity-${savedAt.toISOString().slice(0, 10)}.matko-identity`)

      if (!filePath) {
        return { cancelled: true }
      }

      const courses = await deps.listPublishedCourses()
      const contents = await deps.createBackup({ courses, password })
      await deps.writeFileAtomic(filePath, contents)
      deps.store.write({ courseIds: courses.map((course) => course.id), lastBackupAt: savedAt.toISOString() })

      return { savedAt: savedAt.toISOString() }
    },
  }
}
