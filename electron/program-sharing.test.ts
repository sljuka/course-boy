import { describe, expect, it, vi } from 'vitest'

import { createProgramSharing, type ProgramSharingState } from './program-sharing'

function setup(initial: ProgramSharingState = { followed: {}, published: {} }) {
  let state = initial
  const worker = {
    followCourse: vi.fn(async () => {}),
    getPeers: vi.fn(async () => 1),
    publishProgram: vi.fn(async (programId: string, _path: string, index: number) => ({
      driveKey: `code-${index}`,
      publicId: `public-${programId}`,
    })),
    seedProgram: vi.fn(async () => {}),
    stopSharing: vi.fn(async () => {}),
  }
  const applyUpdate = vi.fn(async () => {})
  const sharing = createProgramSharing({
    applyUpdate,
    now: () => new Date('2026-10-08T12:00:00.000Z'),
    prepareForPublish: async (programId) => `/programs/${programId}`,
    store: { read: () => state, write: (next) => (state = next) },
    worker,
  })
  return { applyUpdate, sharing, state: () => state, worker }
}

describe('program sharing (SLJ-32)', () => {
  it('gives each program its own number at its first Publish, and keeps it', async () => {
    const { sharing, state, worker } = setup()

    expect(await sharing.publish('prog-a')).toEqual({ code: 'code-0' })
    expect(await sharing.publish('prog-b')).toEqual({ code: 'code-1' })
    expect(await sharing.publish('prog-a')).toEqual({ code: 'code-0' })

    expect(worker.publishProgram).toHaveBeenLastCalledWith('prog-a', '/programs/prog-a', 0)
    expect(state().published['prog-a']).toMatchObject({ code: 'code-0', publicIndex: 0 })
    expect(state().nextPublicIndex).toBe(2)
  })

  it('never reuses a removed program’s number', async () => {
    const { sharing } = setup()
    await sharing.publish('prog-a')
    await sharing.forget('prog-a')

    expect(await sharing.publish('prog-b')).toEqual({ code: 'code-1' })
  })

  it('shares published programs and follows imported ones at startup', async () => {
    const { sharing, worker } = setup({
      followed: { 'prog-x': { driveKey: 'drive-x', followedSince: '2026-10-01', publisherId: 'p' } },
      nextPublicIndex: 1,
      published: { 'prog-a': { code: 'code-0', publicIndex: 0 } },
    })
    await sharing.start()

    expect(worker.seedProgram).toHaveBeenCalledWith('prog-a', 'code-0')
    expect(worker.followCourse).toHaveBeenCalledWith('drive-x')
  })

  it('takes an imported program’s latest when its drive changes, and ignores other drives', async () => {
    const { applyUpdate, sharing } = setup()
    sharing.recordImport({ driveKey: 'drive-x', programId: 'prog-x', publisherId: 'p' }, ['course-a'])

    sharing.onDriveChanged('some-course-drive')
    sharing.onDriveChanged('drive-x')
    await Promise.resolve()

    expect(applyUpdate).toHaveBeenCalledTimes(1)
    expect(applyUpdate).toHaveBeenCalledWith('prog-x', 'drive-x')
  })

  it('reports the code and kind, and stops following a removed program', async () => {
    const { sharing, state, worker } = setup()
    sharing.recordImport({ driveKey: 'drive-x', programId: 'prog-x', publisherId: 'p' }, ['course-a'])

    expect(await sharing.getInfo('prog-x', ['course-a'])).toMatchObject({ code: 'drive-x', kind: 'imported', peers: 1 })
    await sharing.forget('prog-x')
    expect(worker.stopSharing).toHaveBeenCalledWith({ driveKey: 'drive-x' })
    expect(state().followed).toEqual({})
  })

  it('shows courses added since the student last saw the program as new', () => {
    const { sharing } = setup()
    sharing.recordImport({ driveKey: 'drive-x', programId: 'prog-x', publisherId: 'p' }, ['course-a'])

    expect(sharing.newCourseIds('prog-x', ['course-a', 'course-b'])).toEqual(['course-b'])
    sharing.markSeen('prog-x', ['course-a', 'course-b'])
    expect(sharing.newCourseIds('prog-x', ['course-a', 'course-b'])).toEqual([])
    expect(sharing.newCourseIds('my-own', ['course-a'])).toEqual([])
  })

  it('takes a restored program back as published: its number taken, shared again', async () => {
    const { sharing, state, worker } = setup({ followed: {}, nextPublicIndex: 1, published: {} })
    sharing.adoptRestored({ driveKey: 'code-4', programId: 'prog-r', publicId: 'public-r', publicIndex: 4 })

    expect(state().published['prog-r']).toEqual({ code: 'code-4', publicId: 'public-r', publicIndex: 4 })
    expect(state().nextPublicIndex).toBe(5)
    expect(worker.seedProgram).toHaveBeenCalledWith('prog-r', 'code-4')
    expect(sharing.hasPublished()).toBe(true)
    expect(await sharing.publish('prog-new')).toEqual({ code: 'code-5' })
  })
})
