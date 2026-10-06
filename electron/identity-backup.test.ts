import { describe, expect, it, vi } from 'vitest'

import { createIdentityBackupService, type IdentityBackupState } from './identity-backup'

function setup({ hasIdentity = true, savePath = '/backups/me.matko-identity' as string | null } = {}) {
  let state: IdentityBackupState = {}
  let published = [{ id: 'course-a', title: 'Fractions' }]
  const deps = {
    chooseSavePath: vi.fn(async () => savePath),
    createBackup: vi.fn(async () => 'encrypted'),
    hasIdentity: () => hasIdentity,
    listPublishedCourses: vi.fn(async () => published),
    now: () => new Date('2026-10-05T12:00:00Z'),
    store: { read: () => state, write: (next: IdentityBackupState) => (state = next) },
    writeFileAtomic: vi.fn(async () => {}),
  }

  return {
    deps,
    publish: (id: string) => (published = [...published, { id, title: id }]),
    service: createIdentityBackupService(deps),
  }
}

describe('identity backup', () => {
  it('saves the encrypted file where the teacher chose, and remembers what it covers', async () => {
    const { deps, publish, service } = setup()

    expect(await service.getStatus()).toEqual({ available: true, coursesNotBackedUp: 1, lastBackupAt: null })
    expect(await service.save('long enough')).toEqual({ savedAt: '2026-10-05T12:00:00.000Z' })
    expect(deps.chooseSavePath).toHaveBeenCalledWith('matko-identity-2026-10-05.matko-identity')
    expect(deps.createBackup).toHaveBeenCalledWith({
      courses: [{ id: 'course-a', title: 'Fractions' }],
      password: 'long enough',
    })
    expect(deps.writeFileAtomic).toHaveBeenCalledWith('/backups/me.matko-identity', 'encrypted')
    expect(await service.getStatus()).toEqual({
      available: true,
      coursesNotBackedUp: 0,
      lastBackupAt: '2026-10-05T12:00:00.000Z',
    })

    publish('course-b')
    expect((await service.getStatus()).coursesNotBackedUp).toBe(1)
  })

  it('writes nothing when the teacher cancels the save dialog', async () => {
    const { deps, service } = setup({ savePath: null })

    expect(await service.save('long enough')).toEqual({ cancelled: true })
    expect(deps.createBackup).not.toHaveBeenCalled()
    expect((await service.getStatus()).lastBackupAt).toBeNull()
  })

  it('refuses a short password and a teacher without an identity', async () => {
    await expect(setup().service.save('short')).rejects.toThrow(/at least 8/)
    await expect(setup({ hasIdentity: false }).service.save('long enough')).rejects.toThrow(/no publisher identity/)
    expect(await setup({ hasIdentity: false }).service.getStatus()).toEqual({
      available: false,
      coursesNotBackedUp: 0,
      lastBackupAt: null,
    })
  })
})
