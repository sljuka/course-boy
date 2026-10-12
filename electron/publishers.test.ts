import { describe, expect, it } from 'vitest'

import { createPublishers, type KnownPublisher, type PublishersState } from './publishers'

const ANA = 'a'.repeat(52)
const MARKO = 'b'.repeat(52)
const MILA = 'c'.repeat(52)
const OWN = 'd'.repeat(52)

function setup(known: KnownPublisher[] = []) {
  let state: PublishersState = {}
  const service = createPublishers({
    known: async () => known,
    now: () => new Date('2026-10-12T08:00:00.000Z'),
    ownPublisherId: async () => OWN,
    store: { read: () => state, write: (next) => (state = next) },
  })
  return { known, service, state: () => state }
}

describe('publishers (SLJ-108)', () => {
  it('lists the publishers of imported courses and co-maintainers, merged by id, never this profile', async () => {
    const { service } = setup([
      { publisherId: ANA, source: { id: 'fractions', kind: 'course', title: 'Fractions' } },
      { publisherId: ANA, source: { id: 'geometry', kind: 'course', title: 'Geometry' } },
      { publisherId: ANA, source: { id: 'fractions', kind: 'course', title: 'Fractions' } },
      { publisherId: MARKO, source: { id: 'fractions', kind: 'maintainer', title: 'Fractions' } },
      { publisherId: OWN, source: { id: 'mine', kind: 'course', title: 'Mine' } },
      { publisherId: 'not an id', source: { id: 'x', kind: 'course', title: 'X' } },
    ])
    expect(await service.list('en')).toEqual([
      {
        label: null,
        publisherId: ANA,
        sources: [
          { id: 'fractions', kind: 'course', title: 'Fractions' },
          { id: 'geometry', kind: 'course', title: 'Geometry' },
        ],
      },
      { label: null, publisherId: MARKO, sources: [{ id: 'fractions', kind: 'maintainer', title: 'Fractions' }] },
    ])
  })

  it('adds a publisher by hand with a label, renames it, and lists labelled ones first', async () => {
    const { service } = setup([{ publisherId: ANA, source: { id: 'fractions', kind: 'course', title: 'Fractions' } }])
    await service.save({ label: '  Mila (math dept.)  ', publisherId: MILA })
    await service.save({ label: 'Ana', publisherId: ANA })
    const list = await service.list('en')
    expect(list.map((entry) => entry.label)).toEqual(['Ana', 'Mila (math dept.)'])
    expect(list[0].sources).toEqual([
      { addedAt: '2026-10-12T08:00:00.000Z', kind: 'manual' },
      { id: 'fractions', kind: 'course', title: 'Fractions' },
    ])

    await service.save({ label: '', publisherId: MILA })
    expect((await service.list('en')).find((entry) => entry.publisherId === MILA)?.label).toBeNull()
  })

  it("removes a publisher; one known from an import stays hidden until it's added back", async () => {
    const { service, state } = setup([{ publisherId: ANA, source: { id: 'fractions', kind: 'course', title: 'Fractions' } }])
    await service.save({ label: 'Mila', publisherId: MILA })
    await service.remove(MILA)
    await service.remove(ANA)
    expect(await service.list('en')).toEqual([])
    expect(state().hidden).toEqual([MILA, ANA])

    await service.save({ label: 'Ana', publisherId: ANA })
    expect((await service.list('en')).map((entry) => entry.publisherId)).toEqual([ANA])
    expect(state().hidden).toEqual([MILA])
  })

  it('refuses what isn’t a Publisher ID, and your own', async () => {
    const { service } = setup()
    await expect(service.save({ label: 'x', publisherId: 'hello' })).rejects.toMatchObject({ code: 'INVALID_ID' })
    await expect(service.save({ label: 'me', publisherId: OWN })).rejects.toMatchObject({ code: 'OWN_ID' })
    await expect(service.remove('hello')).rejects.toMatchObject({ code: 'INVALID_ID' })
  })

  it('caps a label at 80 characters', async () => {
    const { service } = setup()
    await service.save({ label: 'x'.repeat(200), publisherId: MILA })
    expect((await service.list('en'))[0].label).toHaveLength(80)
  })
})
