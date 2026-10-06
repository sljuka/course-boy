import { describe, expect, it } from 'vitest'

import { needsIdentityBackup } from './identity-backup'

describe('needsIdentityBackup', () => {
  it('reminds only when courses are online and not covered by a backup', () => {
    // Gave the consent but never published online (or only prints): nothing to back up.
    expect(needsIdentityBackup({ available: true, coursesNotBackedUp: 0, lastBackupAt: null })).toBe(false)
    expect(needsIdentityBackup({ available: false, coursesNotBackedUp: 0, lastBackupAt: null })).toBe(false)
    // Online, never backed up; or a course published since the last backup.
    expect(needsIdentityBackup({ available: true, coursesNotBackedUp: 1, lastBackupAt: null })).toBe(true)
    expect(needsIdentityBackup({ available: true, coursesNotBackedUp: 2, lastBackupAt: '2026-10-05T12:00:00Z' })).toBe(true)
    expect(needsIdentityBackup({ available: true, coursesNotBackedUp: 0, lastBackupAt: '2026-10-05T12:00:00Z' })).toBe(false)
  })
})
