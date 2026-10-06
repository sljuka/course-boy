// The publisher identity backup (SLJ-42 part 1 / SLJ-53), as the renderer
// sees it: whether there's an identity to back up, when it was last backed up,
// and how many published courses came after. Kept free of React so the main
// process shares these types. The file format and its encryption live in
// workers/identity-backup.cjs; the key itself never reaches the renderer.

// Must match MIN_PASSWORD_LENGTH in workers/identity-backup.cjs.
export const MIN_BACKUP_PASSWORD_LENGTH = 8

export type IdentityBackupStatus = {
  // The teacher has given the sharing consent: there's a publisher identity.
  available: boolean
  // When the newest backup was saved, or null if none was.
  lastBackupAt: string | null
  // Courses published online (they have a code) missing from the newest
  // backup (all of them, without one): restoring that backup couldn't find
  // them again. 0 for a teacher who never published online.
  coursesNotBackedUp: number
}

export type SaveIdentityBackupResult = { savedAt: string } | { cancelled: true }

// A reminder only when it matters: courses are online, signed with the
// identity, and the newest backup (if any) doesn't cover them. Printing or
// handing course files over never involves the identity, so never a reminder.
export function needsIdentityBackup(status: IdentityBackupStatus | undefined): boolean {
  return Boolean(status?.available && status.coursesNotBackedUp > 0)
}
