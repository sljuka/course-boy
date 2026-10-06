// The publisher identity backup (SLJ-42 part 1 / SLJ-53), as the renderer
// sees it: whether there's an identity to back up, when it was last backed up,
// and how many published courses came after. Kept free of React so the main
// process shares these types. The file format and its encryption live in
// workers/identity-backup.cjs; the key itself never reaches the renderer.

import type { TransferInfo } from "./sharing";

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

// ─── Restoring (SLJ-54) ─────────────────────────────────────────────────────

// The backup file the teacher picked, before the password: whose identity it
// holds and when it was saved. Problems are codes, for the renderer to word.
export type ChooseIdentityBackupResult =
  | { cancelled: true }
  | { error: "invalidFile" | "unsupportedVersion" }
  | { file: { createdAt: string; fileName: string; publisherId: string } };

export type RestoreIdentityResult =
  // "alreadyPublishing": this profile has put courses online with its own
  // identity, which restoring would lose; restore into a new profile instead.
  | { error: "alreadyPublishing" | "noFile" | "wrongPassword" }
  | { restored: { courseCount: number } };

// A course published with the restored identity on the other computer, being
// brought back from its students: "waiting" until it's downloaded (`transfer`
// shows progress, or that nobody who has it is online), then "restored".
export type RestoredCourseStatus = {
  id: string;
  state: "restored" | "waiting";
  title: string;
  transfer: TransferInfo | null;
};

export type IdentityRestoreStatus = {
  courses: RestoredCourseStatus[];
  publisherId: string;
  restoredAt: string;
} | null;
