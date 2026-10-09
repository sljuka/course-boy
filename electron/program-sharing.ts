import type { ProgramSharingInfo } from '../src/lib/program-package'

// Programs online (SLJ-32 phase 2), alongside course-sharing.ts:
// - your programs: Publish puts the program's folder into its own drive, its
//   code from the publishing identity and the program's own number (given at
//   its first Publish, never reused), so it never changes; shared again by its
//   code at every start;
// - imported programs: followed by their code, and replaced with the
//   publisher's latest on their own whenever it changes (no versions to keep
//   or offer: a program is just its latest list).

export type ProgramSharingState = {
  // `seenCourseIds`: the program's courses the student has already seen (on
  // its page, or when it was imported); any other is shown as new.
  followed: Record<string, { driveKey: string; followedSince: string; publisherId: string; seenCourseIds?: string[] }>
  nextPublicIndex?: number
  published: Record<string, { code?: string; publicId?: string; publicIndex: number; publishedAt?: string }>
}

export type ProgramSharingStore = {
  read(): ProgramSharingState
  write(state: ProgramSharingState): void
}

export type ProgramSharingWorker = {
  followCourse(driveKey: string): Promise<void>
  getPeers(target: { courseId: string } | { driveKey: string }): Promise<number | null>
  publishProgram(programId: string, programPath: string, publicIndex: number): Promise<{ driveKey: string; publicId: string }>
  seedProgram(programId: string, driveKey: string): Promise<void>
  stopSharing(target: { courseId: string } | { driveKey: string }): Promise<void>
}

export type ProgramSharingDeps = {
  now?: () => Date
  // Before publishing: the program's folder as it should go online (images
  // it no longer uses removed). Returns its path.
  prepareForPublish(programId: string): Promise<string>
  // Replaces an imported program with its publisher's latest (the worker
  // mirrors the drive into a copy, which is validated and swapped in).
  applyUpdate(programId: string, driveKey: string): Promise<void>
  store: ProgramSharingStore
  worker: ProgramSharingWorker
}


// Programs share the worker's published drives with courses under this prefix.
export const PROGRAM_ENTRY_PREFIX = "program:"

export function createProgramSharing(deps: ProgramSharingDeps) {
  const now = deps.now ?? (() => new Date())
  const applying = new Map<string, Promise<void>>()

  function update(change: (state: ProgramSharingState) => ProgramSharingState) {
    deps.store.write(change(deps.store.read()))
  }

  // The program's number among this publisher's programs: given at its first
  // Publish and kept, so its code never changes; never reused after removal.
  function publicIndexFor(programId: string): number {
    const state = deps.store.read()
    const known = state.published[programId]?.publicIndex
    if (typeof known === "number") return known

    const index = state.nextPublicIndex ?? 0
    update((current) => ({
      ...current,
      nextPublicIndex: index + 1,
      published: { ...current.published, [programId]: { publicIndex: index } },
    }));
    return index
  }

  return {
    // Puts the program's current state online (identity unlocked: main checks
    // first). Returns its code.
    async publish(programId: string): Promise<{ code: string }> {
      const publicIndex = publicIndexFor(programId)
      const programPath = await deps.prepareForPublish(programId)
      const { driveKey, publicId } = await deps.worker.publishProgram(programId, programPath, publicIndex)
      update((state) => ({
        ...state,
        published: {
          ...state.published,
          [programId]: { code: driveKey, publicId, publicIndex, publishedAt: now().toISOString() },
        },
      }))
      return { code: driveKey }
    },

    async getInfo(programId: string, currentCourseIds: string[]): Promise<ProgramSharingInfo> {
      const state = deps.store.read()
      const followed = state.followed[programId]
      const published = state.published[programId]
      const code = followed?.driveKey ?? published?.code ?? null
      const peers = code
        ? await deps.worker
            .getPeers(followed ? { driveKey: followed.driveKey } : { courseId: PROGRAM_ENTRY_PREFIX + programId })
            .catch(() => null)
        : null
      return {
        code,
        kind: followed ? "imported" : "local",
        newCourseIds: followed ? this.newCourseIds(programId, currentCourseIds) : [],
        peers,
        publishedAt: published?.publishedAt ?? null,
      }
    },

    // At startup: your published programs shared again by their code (no
    // identity needed for that), imported ones followed.
    async start(): Promise<void> {
      const state = deps.store.read()
      await Promise.all([
        ...Object.entries(state.published)
          .filter(([, entry]) => entry.code)
          .map(([programId, entry]) =>
            deps.worker.seedProgram(programId, entry.code!).catch((error) => {
              console.error(`[program-sharing] sharing ${programId} failed:`, error)
            }),
          ),
        ...Object.entries(state.followed).map(([programId, entry]) =>
          deps.worker.followCourse(entry.driveKey).catch((error) => {
            console.error(`[program-sharing] following ${programId} failed:`, error)
          }),
        ),
      ])
    },

    // Restoring (SLJ-32): a program of yours found again with the restored
    // identity and landed here. Its number stays taken, and it's shared again
    // by its code (Publish works on top of the history found).
    adoptRestored({ driveKey, programId, publicId, publicIndex }: { driveKey: string; programId: string; publicId: string; publicIndex: number }) {
      update((state) => ({
        ...state,
        nextPublicIndex: Math.max(state.nextPublicIndex ?? 0, publicIndex + 1),
        published: { ...state.published, [programId]: { code: driveKey, publicId, publicIndex } },
      }))
      void deps.worker.seedProgram(programId, driveKey).catch((error) => {
        console.error(`[program-sharing] sharing ${programId} failed:`, error)
      })
    },

    // Whether any program is online with this profile's identity.
    hasPublished(): boolean {
      return Object.values(deps.store.read().published).some((entry) => Boolean(entry.code))
    },

    // A program just imported (the worker landed it under programs/): none of
    // its courses is new yet.
    recordImport(
      { driveKey, programId, publisherId }: { driveKey: string; programId: string; publisherId: string },
      courseIds: string[],
    ) {
      update((state) => ({
        ...state,
        followed: {
          ...state.followed,
          [programId]: state.followed[programId] ?? {
            driveKey,
            followedSince: now().toISOString(),
            publisherId,
            seenCourseIds: courseIds,
          },
        },
      }))
    },

    // An imported program's courses the student hasn't seen yet (added by its
    // publisher since). None for your own programs.
    newCourseIds(programId: string, currentCourseIds: string[]): string[] {
      const seen = deps.store.read().followed[programId]?.seenCourseIds
      if (!seen) return []
      return currentCourseIds.filter((courseId) => !seen.includes(courseId))
    },

    // The student has seen the program's current courses (opened its page).
    markSeen(programId: string, courseIds: string[]) {
      update((state) => {
        const followed = state.followed[programId]
        if (!followed) return state
        return { ...state, followed: { ...state.followed, [programId]: { ...followed, seenCourseIds: courseIds } } }
      })
    },

    // A followed drive changed: if it's an imported program's, take the
    // publisher's latest. One update at a time per program.
    onDriveChanged(driveKey: string): void {
      const entry = Object.entries(deps.store.read().followed).find(([, followed]) => followed.driveKey === driveKey)
      if (!entry) return
      const [programId] = entry
      if (applying.has(programId)) return

      const run = deps
        .applyUpdate(programId, driveKey)
        .catch((error) => console.error(`[program-sharing] updating ${programId} failed:`, error))
        .finally(() => applying.delete(programId))
      applying.set(programId, run)
    },

    // The program was removed from this device: stop sharing or following it.
    async forget(programId: string): Promise<void> {
      const state = deps.store.read()
      const followed = state.followed[programId]
      if (followed) await deps.worker.stopSharing({ driveKey: followed.driveKey }).catch(() => {})
      if (state.published[programId]?.code) {
        await deps.worker.stopSharing({ courseId: PROGRAM_ENTRY_PREFIX + programId }).catch(() => {})
      }
      update((current) => {
        const followedNext = { ...current.followed }
        delete followedNext[programId]
        // A published program's number stays taken (its code stays unique).
        const publishedNext = { ...current.published }
        if (publishedNext[programId]) publishedNext[programId] = { publicIndex: publishedNext[programId].publicIndex }
        return { ...current, followed: followedNext, published: publishedNext }
      })
    },
  }
}

export type ProgramSharingService = ReturnType<typeof createProgramSharing>
