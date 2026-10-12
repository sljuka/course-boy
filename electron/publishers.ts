// Publishers (SLJ-108): an address book of Publisher IDs, per profile.
//
// It keeps only what the teacher added: labels, publishers entered by hand,
// and the ones they removed. The rest comes from what the app knows already,
// read each time the list is shown:
// - the publisher of every imported course and program (its source.json's
//   `publisher.id`: claimed by the course, not verified, SLJ-18);
// - the people this profile maintains courses with (SLJ-11).
// So nothing needs recording at import time, and removing a course removes
// that reason from the list (an entry with a label stays).
//
// A label is what the teacher typed: never proof of who someone is. Nothing
// here is shared with anyone.
//
// No Electron dependency: unit-tested in publishers.test.ts.

import type { PublisherEntry, PublisherSource } from '../src/lib/publishers'

export type PublishersState = {
  // By publisher id: what the teacher added.
  entries?: Record<string, { addedAt: string; label: string | null }>
  // Publisher ids the teacher removed though the app knows them (an import):
  // not listed again until the teacher adds them back.
  hidden?: string[]
}

// A publisher the app knows from somewhere else, and where from.
export type KnownPublisher = { publisherId: string; source: PublisherSource }

export type PublishersDeps = {
  known(locale: string): Promise<KnownPublisher[]>
  // This profile's own publisher id ('' while there's none): never listed.
  ownPublisherId(): Promise<string>
  now?: () => Date
  store: { read(): PublishersState; write(state: PublishersState): void }
}

export class PublishersError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const MAX_LABEL_LENGTH = 80

// A publisher id as the app shows it: z32, 52 characters (a 32-byte key).
export function isPublisherId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{52,64}$/i.test(value)
}

export function createPublishers(deps: PublishersDeps) {
  const now = deps.now ?? (() => new Date())

  function state(): Required<PublishersState> {
    const current = deps.store.read()
    return { entries: current.entries ?? {}, hidden: current.hidden ?? [] }
  }

  return {
    // Everyone in the address book, labelled ones first (by label), then by id.
    async list(locale: string): Promise<PublisherEntry[]> {
      const { entries, hidden } = state()
      const own = await deps.ownPublisherId()
      const byId = new Map<string, PublisherEntry>()
      const entryFor = (publisherId: string) => {
        let entry = byId.get(publisherId)
        if (!entry) {
          entry = { label: entries[publisherId]?.label ?? null, publisherId, sources: [] }
          byId.set(publisherId, entry)
        }
        return entry
      }
      for (const [publisherId, added] of Object.entries(entries)) {
        entryFor(publisherId).sources.push({ addedAt: added.addedAt, kind: 'manual' })
      }
      for (const { publisherId, source } of await deps.known(locale)) {
        if (!isPublisherId(publisherId) || (hidden.includes(publisherId) && !entries[publisherId])) continue
        const entry = entryFor(publisherId)
        const duplicate = entry.sources.some(
          (existing) => existing.kind === source.kind && 'id' in existing && 'id' in source && existing.id === source.id,
        )
        if (!duplicate) entry.sources.push(source)
      }
      byId.delete(own)
      return [...byId.values()].sort((left, right) => {
        if (left.label && right.label) return left.label.localeCompare(right.label)
        if (left.label || right.label) return left.label ? -1 : 1
        return left.publisherId.localeCompare(right.publisherId)
      })
    },

    // Adds a publisher by hand, or renames one (a label of null or "" clears it).
    async save(input: { label: string | null; publisherId: string }): Promise<void> {
      if (!isPublisherId(input.publisherId)) throw new PublishersError('INVALID_ID', 'This isn’t a Publisher ID')
      if (input.publisherId === (await deps.ownPublisherId())) {
        throw new PublishersError('OWN_ID', 'This is your own Publisher ID')
      }
      const label = input.label?.trim().slice(0, MAX_LABEL_LENGTH) || null
      const { entries, hidden } = state()
      deps.store.write({
        entries: {
          ...entries,
          [input.publisherId]: { addedAt: entries[input.publisherId]?.addedAt ?? now().toISOString(), label },
        },
        hidden: hidden.filter((id) => id !== input.publisherId),
      })
    },

    // Removes a publisher from the list: what the teacher added goes, and a
    // publisher the app knows from an import stays hidden.
    async remove(publisherId: string): Promise<void> {
      if (!isPublisherId(publisherId)) throw new PublishersError('INVALID_ID', 'This isn’t a Publisher ID')
      const { entries, hidden } = state()
      const rest = { ...entries }
      delete rest[publisherId]
      deps.store.write({ entries: rest, hidden: hidden.includes(publisherId) ? hidden : [...hidden, publisherId] })
    },
  }
}

export type PublishersService = ReturnType<typeof createPublishers>
