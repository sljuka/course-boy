// The publisher identity (SLJ-55, part 3 of SLJ-42): one password, one file.
//
// The identity is 32 random bytes. Every course's public id and code, and the
// publisher id, are derived from it (workers/identity-keys.cjs). The setup
// wizard creates it (at the first Publish, or from Settings → Publishing),
// never before, so a teacher who only makes or prints courses never has one.
//
// It's kept in the profile's identity file, `publisher-identity.matko-identity`:
// the identity encrypted with the teacher's password, in the backup file's
// format (workers/identity-backup.cjs; the worker seals and opens it). The file
// never changes after setup, so it is the backup: "Open identity file" shows it
// for copying, and restoring takes a copy and its password (identity-restore.ts).
//
// It's locked at every start. The profile asks for the password before Home
// (or "Open without publishing"); unlocked, the identity is handed to the worker
// in memory, and the worker's store never holds it. Locked, published courses
// are still shared by their code; only publishing a new version waits.
//
// The file is passed in, so this has no Electron dependency and is unit-tested
// in publisher-identity.test.ts.

import type { IdentityStatus, SetUpIdentityResult, UnlockIdentityResult } from '../src/lib/publisher-identity'
import { MIN_IDENTITY_PASSWORD_LENGTH } from '../src/lib/publisher-identity'

export const IDENTITY_FILE_NAME = 'publisher-identity.matko-identity'

export type PublisherIdentityDeps = {
  file: { read(): string | null; write(text: string): void }
  randomKey(): Buffer
  worker: {
    openIdentity(text: string, password: string): Promise<{ key: Buffer; publisherId: string }>
    sealIdentity(key: Buffer, password: string): Promise<string>
    // Hands the identity to the worker (null takes it back); its publisher id.
    setIdentity(key: Buffer | null): Promise<string | null>
  }
}

// The file's public part names the publisher; no password needed to read it.
function readPublisherId(text: string | null): string | null {
  if (!text) return null
  const file = JSON.parse(text) as { publisherId?: unknown }
  if (typeof file.publisherId !== 'string') throw new Error("The identity file can't be read")
  return file.publisherId
}

export function createPublisherIdentity(deps: PublisherIdentityDeps) {
  // While unlocked: the identity, in memory.
  let key: Buffer | null = null
  let openedWithoutPublishing = false

  async function handOver(identity: Buffer): Promise<string> {
    const publisherId = await deps.worker.setIdentity(identity)
    if (!publisherId) throw new Error('The worker did not take the publisher identity')
    key = identity
    return publisherId
  }

  return {
    exists(): boolean {
      return deps.file.read() !== null
    },

    publisherId(): string | null {
      return readPublisherId(deps.file.read())
    },

    isLocked(): boolean {
      return key === null && deps.file.read() !== null
    },

    // The setup wizard: a new identity, locked with `password`, and unlocked
    // for this session.
    async setUp(password: string): Promise<SetUpIdentityResult> {
      if (deps.file.read()) return { error: 'exists' }
      if ([...password].length < MIN_IDENTITY_PASSWORD_LENGTH) return { error: 'weakPassword' }

      const identity = deps.randomKey()
      const sealed = await deps.worker.sealIdentity(identity, password)
      await handOver(identity)
      deps.file.write(sealed)
      return { ok: true }
    },

    async unlock(password: string): Promise<UnlockIdentityResult> {
      const text = deps.file.read()
      if (!text || key) return { unlocked: true }

      try {
        const opened = await deps.worker.openIdentity(text, password)
        await handOver(opened.key)
        return { unlocked: true }
      } catch (error) {
        if ((error as { code?: string }).code === 'WRONG_PASSWORD') return { error: 'wrongPassword' }
        throw error
      }
    },

    // A restored identity file (SLJ-54), already opened with its password:
    // it becomes this profile's, as it is, and is unlocked.
    async install(text: string, identity: Buffer): Promise<void> {
      const publisherId = await handOver(identity)
      if (publisherId !== readPublisherId(text)) {
        throw new Error("The restored identity doesn't match its file")
      }
      deps.file.write(text)
    },

    // Is `password` the identity's? (Removing the profile asks for it, SLJ-61.)
    // Nothing is unlocked by it.
    async checkPassword(password: string): Promise<boolean> {
      const text = deps.file.read()
      if (!text) return false
      try {
        ;(await deps.worker.openIdentity(text, password)).key.fill(0)
        return true
      } catch (error) {
        if ((error as { code?: string }).code === 'WRONG_PASSWORD') return false
        throw error
      }
    },

    // "Open without publishing" on the password screen before Home.
    openWithoutPublishing(): void {
      openedWithoutPublishing = true
    },

    getStatus(): IdentityStatus {
      const text = deps.file.read()
      const locked = text !== null && key === null
      return {
        askBeforeHome: locked && !openedWithoutPublishing,
        exists: text !== null,
        locked,
        publisherId: readPublisherId(text),
      }
    },

    // The profile is closing.
    close(): void {
      key?.fill(0)
      key = null
    },
  }
}

export type PublisherIdentity = ReturnType<typeof createPublisherIdentity>
