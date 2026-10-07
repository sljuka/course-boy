// The publisher identity (SLJ-42/53/54/55), as the renderer sees it. Kept free
// of React so the main process shares these types.
//
// One password, one file: the setup wizard (at the first Publish, or Settings →
// Publishing) creates the identity and its identity file, encrypted with the
// teacher's password (workers/identity-backup.cjs). That file is also the
// backup: copied elsewhere, it restores the identity on another computer, and
// the courses are found again from the identity alone. The key itself never
// reaches the renderer.

// Must match MIN_PASSWORD_LENGTH in workers/identity-backup.cjs.
export const MIN_IDENTITY_PASSWORD_LENGTH = 8;

export type IdentityStatus = {
  // Set up (the wizard ran, or it was restored).
  exists: boolean;
  // Not unlocked with the password yet this session: publishing waits.
  locked: boolean;
  // Ask for the password before Home: set up, locked, and not skipped this
  // session with "Open without publishing".
  askBeforeHome: boolean;
  publisherId: string | null;
};

export type SetUpIdentityResult = { ok: true } | { error: "exists" | "weakPassword" };

export type UnlockIdentityResult = { unlocked: true } | { error: "wrongPassword" };

// ─── Restoring (SLJ-54) ─────────────────────────────────────────────────────

// The identity file the teacher picked, before the password: whose identity
// it holds and when it was made. Problems are codes, for the renderer to word.
export type ChooseIdentityFileResult =
  | { cancelled: true }
  | { error: "invalidFile" | "unsupportedVersion" }
  | { file: { createdAt: string; fileName: string; publisherId: string } };

export type RestoreIdentityResult =
  // "alreadyPublishing": this profile has put courses online with another
  // identity, which restoring would lose; restore into a new profile instead.
  | { error: "alreadyPublishing" | "noFile" | "wrongPassword" }
  | { restored: true };

// A course found again with the restored identity and back on this device.
export type RestoredCourse = { id: string; title: string };

export type IdentityRestoreStatus = {
  courses: RestoredCourse[];
  publisherId: string;
  restoredAt: string;
  // Still looking for the publisher's courses among students.
  searching: boolean;
} | null;
